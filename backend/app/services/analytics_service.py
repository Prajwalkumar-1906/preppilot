from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, case

from app.models.attempt import Attempt
from app.models.evaluation import Evaluation
from app.models.question import Question
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview,
    ScoreTrendPoint,
    CategoryPerformance,
    SkillRadarAxis,
    SpeechAnalytics,
    WeakSpot,
)


class AnalyticsService:
    @staticmethod
    def get_overview(db: Session, user: User) -> AnalyticsOverview:
        """Computes summary metrics: streak, total questions, sessions, minutes, and overall score."""
        # Total sessions
        total_sessions = db.execute(
            select(func.count(SessionModel.id)).where(SessionModel.user_id == user.id)
        ).scalar() or 0

        # Total attempts and average score
        agg_query = (
            select(
                func.count(Attempt.id),
                func.coalesce(func.avg(Evaluation.overall_score), 0.0),
                func.coalesce(func.sum(SessionModel.total_duration_sec), 0)
            )
            .select_from(Attempt)
            .outerjoin(Evaluation, Attempt.id == Evaluation.attempt_id)
            .outerjoin(SessionModel, Attempt.session_id == SessionModel.id)
            .where(Attempt.user_id == user.id)
        )
        total_q, avg_score, total_sec = db.execute(agg_query).one()

        total_minutes = max(int(total_sec / 60), total_q * 3)

        # Calculate streak days from attempt timestamps
        date_query = (
            select(func.date(Attempt.created_at))
            .where(Attempt.user_id == user.id)
            .distinct()
            .order_by(desc(func.date(Attempt.created_at)))
        )
        dates = [d for d in db.execute(date_query).scalars().all() if d is not None]

        streak = 0
        if dates:
            today = datetime.now(timezone.utc).date()
            # If candidate practiced today or yesterday, count streak
            latest_date = datetime.strptime(str(dates[0]), "%Y-%m-%d").date() if isinstance(dates[0], str) else dates[0]
            if latest_date >= today - timedelta(days=1):
                streak = 1
                curr = latest_date
                for d_val in dates[1:]:
                    d = datetime.strptime(str(d_val), "%Y-%m-%d").date() if isinstance(d_val, str) else d_val
                    if d == curr - timedelta(days=1):
                        streak += 1
                        curr = d
                    else:
                        break

        return AnalyticsOverview(
            streak_days=streak,
            total_sessions=total_sessions,
            total_questions=total_q or 0,
            total_minutes=total_minutes,
            average_score=round(float(avg_score or 0.0), 1),
            target_role=user.profile.target_role if user.profile else "SDE",
        )

    @staticmethod
    def get_trends(db: Session, user: User, days: int = 30) -> List[ScoreTrendPoint]:
        """Time-series of overall and dimension scores grouped by date."""
        since_date = datetime.now(timezone.utc) - timedelta(days=days)

        query = (
            select(
                func.date(Attempt.created_at).label("attempt_date"),
                func.avg(Evaluation.overall_score).label("avg_overall"),
                func.avg(Evaluation.clarity_score).label("avg_clarity"),
                func.avg(Evaluation.relevance_score).label("avg_relevance"),
                func.avg(Evaluation.technical_score).label("avg_technical"),
                func.count(Attempt.id).label("attempt_count"),
            )
            .join(Evaluation, Attempt.id == Evaluation.attempt_id)
            .where(Attempt.user_id == user.id, Attempt.created_at >= since_date)
            .group_by(func.date(Attempt.created_at))
            .order_by(func.date(Attempt.created_at).asc())
        )
        rows = db.execute(query).all()

        return [
            ScoreTrendPoint(
                date=str(r.attempt_date),
                overall_score=round(float(r.avg_overall or 0.0), 1),
                clarity_score=round(float(r.avg_clarity or 0.0), 1),
                relevance_score=round(float(r.avg_relevance or 0.0), 1),
                technical_score=round(float(r.avg_technical or 0.0), 1),
                attempt_count=r.attempt_count,
            )
            for r in rows
        ]

    @staticmethod
    def get_category_performance(db: Session, user: User) -> List[CategoryPerformance]:
        """Aggregates score by question category with difficulty breakdown."""
        query = (
            select(
                Question.category,
                func.avg(Evaluation.overall_score).label("avg_score"),
                func.count(Attempt.id).label("attempt_count"),
                func.avg(case((Question.difficulty == "easy", Evaluation.overall_score))).label("easy_avg"),
                func.avg(case((Question.difficulty == "medium", Evaluation.overall_score))).label("medium_avg"),
                func.avg(case((Question.difficulty == "hard", Evaluation.overall_score))).label("hard_avg"),
            )
            .select_from(Attempt)
            .join(Question, Attempt.question_id == Question.id)
            .join(Evaluation, Attempt.id == Evaluation.attempt_id)
            .where(Attempt.user_id == user.id)
            .group_by(Question.category)
        )
        rows = db.execute(query).all()

        return [
            CategoryPerformance(
                category=r.category,
                average_score=round(float(r.avg_score or 0.0), 1),
                attempt_count=r.attempt_count,
                easy_avg=round(float(r.easy_avg), 1) if r.easy_avg else None,
                medium_avg=round(float(r.medium_avg), 1) if r.medium_avg else None,
                hard_avg=round(float(r.hard_avg), 1) if r.hard_avg else None,
            )
            for r in rows
        ]

    @staticmethod
    def get_skill_radar(db: Session, user: User) -> List[SkillRadarAxis]:
        """Calculates 6-axis skill profile comparing all-time vs last 30 days."""
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        # Baseline query
        base_query = (
            select(
                func.avg(Evaluation.clarity_score).label("clarity"),
                func.avg(Evaluation.relevance_score).label("relevance"),
                func.avg(Evaluation.technical_score).label("technical"),
                func.coalesce(func.avg(Evaluation.communication_score), 7.0).label("communication"),
                func.avg(case((Question.category == "dsa_concepts", Evaluation.overall_score))).label("dsa"),
                func.avg(case((Question.category == "system_design_basics", Evaluation.overall_score))).label("sys_design"),
            )
            .select_from(Attempt)
            .join(Question, Attempt.question_id == Question.id)
            .join(Evaluation, Attempt.id == Evaluation.attempt_id)
            .where(Attempt.user_id == user.id)
        )

        all_row = db.execute(base_query).one()
        recent_row = db.execute(base_query.where(Attempt.created_at >= thirty_days_ago)).one()

        skills = [
            ("Clarity & Structure", all_row.clarity, recent_row.clarity),
            ("Relevance", all_row.relevance, recent_row.relevance),
            ("Technical Depth", all_row.technical, recent_row.technical),
            ("Communication", all_row.communication, recent_row.communication),
            ("DSA Mastery", all_row.dsa, recent_row.dsa),
            ("System Design", all_row.sys_design, recent_row.sys_design),
        ]

        return [
            SkillRadarAxis(
                skill=name,
                all_time=round(float(a_val or 7.0), 1),
                recent_30d=round(float(r_val or a_val or 7.0), 1),
            )
            for name, a_val, r_val in skills
        ]

    @staticmethod
    def get_speech_analytics(db: Session, user: User) -> SpeechAnalytics:
        """Computes speech metrics, WPM trends, and filler word frequency distribution."""
        query = (
            select(Attempt.speech_metrics, Attempt.created_at)
            .where(Attempt.user_id == user.id, Attempt.answer_mode == "voice")
            .order_by(Attempt.created_at.asc())
        )
        rows = db.execute(query).all()

        if not rows:
            return SpeechAnalytics(
                average_wpm=0.0,
                total_voice_attempts=0,
                optimal_pace_percentage=0.0,
                top_filler_words=[],
                wpm_trend=[],
            )

        wpms = []
        fillers = []
        wpm_trend = []
        optimal_count = 0

        for r in rows:
            m = r.speech_metrics or {}
            wpm = float(m.get("wpm", 0.0))
            if wpm > 0:
                wpms.append(wpm)
                if 120.0 <= wpm <= 170.0:
                    optimal_count += 1
                wpm_trend.append({"date": r.created_at.strftime("%b %d"), "wpm": wpm})
            fillers.extend(m.get("filler_words", []))

        avg_wpm = round(sum(wpms) / len(wpms), 1) if wpms else 0.0
        optimal_pct = round((optimal_count / len(wpms)) * 100, 1) if wpms else 0.0

        filler_counts = [
            {"word": word, "count": count}
            for word, count in Counter(fillers).most_common(5)
        ]

        return SpeechAnalytics(
            average_wpm=avg_wpm,
            total_voice_attempts=len(rows),
            optimal_pace_percentage=optimal_pct,
            top_filler_words=filler_counts,
            wpm_trend=wpm_trend[-10:],
        )

    @staticmethod
    def get_weak_spots(db: Session, user: User) -> List[WeakSpot]:
        """Identifies lowest-scoring categories to generate targeted practice recommendations."""
        query = (
            select(
                Question.category,
                Question.role_tag,
                func.avg(Evaluation.overall_score).label("avg_score"),
                func.count(Attempt.id).label("attempt_count"),
            )
            .select_from(Attempt)
            .join(Question, Attempt.question_id == Question.id)
            .join(Evaluation, Attempt.id == Evaluation.attempt_id)
            .where(Attempt.user_id == user.id)
            .group_by(Question.category, Question.role_tag)
            .order_by(func.avg(Evaluation.overall_score).asc())
            .limit(3)
        )
        rows = db.execute(query).all()

        recommendations_map = {
            "dsa_concepts": "Practice Two-Pointer and Dynamic Sliding Window algorithmic patterns",
            "system_design_basics": "Review caching trade-offs, database indexing, and rate-limiting architectures",
            "technical": "Focus on core language runtime mechanics and memory concurrency management",
            "behavioral": "Structure answers strictly using the STAR framework (Situation, Task, Action, Result)",
            "hr": "Align personal narrative with company engineering culture and 6-month growth goals",
            "project_based": "Articulate specific architectural bottlenecks and technical trade-offs from past projects",
        }

        return [
            WeakSpot(
                category=r.category,
                role_tag=r.role_tag,
                average_score=round(float(r.avg_score or 0.0), 1),
                attempt_count=r.attempt_count,
                recommendation=recommendations_map.get(
                    r.category, f"Strengthen fundamentals in {r.category.replace('_', ' ')}"
                ),
            )
            for r in rows
        ]
