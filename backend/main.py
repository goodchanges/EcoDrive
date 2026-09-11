from datetime import datetime, timedelta
from pathlib import Path
import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# App setup
# --------------------------------------------------

app = FastAPI(title="EcoDrive API")


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Database setup
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "ecodrive.db"


def get_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            distance REAL NOT NULL,
            fuel REAL NOT NULL,
            average_speed REAL NOT NULL,
            idle_time REAL NOT NULL,
            harsh_braking INTEGER NOT NULL,
            harsh_acceleration INTEGER NOT NULL,
            efficiency REAL NOT NULL,
            eco_score INTEGER NOT NULL,
            co2 REAL NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


init_db()


# --------------------------------------------------
# Input model
# --------------------------------------------------

class Trip(BaseModel):
    distance: float = Field(gt=0)
    fuel: float = Field(gt=0)
    average_speed: float = Field(ge=0)
    idle_time: float = Field(ge=0)
    harsh_braking: int = Field(ge=0)
    harsh_acceleration: int = Field(ge=0)


# --------------------------------------------------
# Eco score calculation
# --------------------------------------------------

def calculate_trip_metrics(trip: Trip):
    # Fuel efficiency
    efficiency = trip.distance / trip.fuel

    # Simplified gasoline CO2 estimate:
    # approximately 2.31 kg CO2 per liter
    co2 = trip.fuel * 2.31

    # Start with perfect score
    score = 100

    # Efficiency penalty
    if efficiency < 10:
        score -= 20
    elif efficiency < 15:
        score -= 10

    # Speed penalty
    if trip.average_speed > 100:
        score -= 15
    elif trip.average_speed > 80:
        score -= 10
    elif trip.average_speed > 70:
        score -= 5

    # Idle-time penalty
    if trip.idle_time > 10:
        score -= min((trip.idle_time - 10) * 2, 10)

    # Harsh driving penalties
    score -= trip.harsh_braking * 3
    score -= trip.harsh_acceleration * 2

    # Keep score between 0 and 100
    score = max(0, min(int(score), 100))

    return {
        "efficiency": round(efficiency, 2),
        "co2": round(co2, 2),
        "score": score,
    }


# --------------------------------------------------
# Root endpoint
# --------------------------------------------------

@app.get("/")
def read_root():
    return {
        "message": "EcoDrive API is running!"
    }


# --------------------------------------------------
# Add a trip
# --------------------------------------------------

@app.post("/api/trips")
def add_trip(trip: Trip):
    metrics = calculate_trip_metrics(trip)

    created_at = datetime.now().isoformat(timespec="seconds")

    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO trips (
            distance,
            fuel,
            average_speed,
            idle_time,
            harsh_braking,
            harsh_acceleration,
            efficiency,
            eco_score,
            co2,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            trip.distance,
            trip.fuel,
            trip.average_speed,
            trip.idle_time,
            trip.harsh_braking,
            trip.harsh_acceleration,
            metrics["efficiency"],
            metrics["score"],
            metrics["co2"],
            created_at,
        ),
    )

    conn.commit()
    trip_id = cursor.lastrowid
    conn.close()

    return {
        "id": trip_id,
        "distance": trip.distance,
        "fuel": trip.fuel,
        "efficiency": metrics["efficiency"],
        "co2": metrics["co2"],
        "score": metrics["score"],
        "created_at": created_at,
    }


# --------------------------------------------------
# Calculate trip without saving to SQLite
# --------------------------------------------------

@app.post("/api/calculate-trip")
def calculate_trip(trip: Trip):
    metrics = calculate_trip_metrics(trip)

    return {
        "efficiency": metrics["efficiency"],
        "co2": metrics["co2"],
        "score": metrics["score"],
    }


# --------------------------------------------------
# Get all trips
# --------------------------------------------------

@app.get("/api/trips")
def get_trips():
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            id,
            distance,
            fuel,
            average_speed,
            idle_time,
            harsh_braking,
            harsh_acceleration,
            efficiency,
            eco_score,
            co2,
            created_at
        FROM trips
        ORDER BY id DESC
        """
    ).fetchall()

    conn.close()

    trips = [dict(row) for row in rows]

    return {
        "trips": trips
    }


# --------------------------------------------------
# Dashboard statistics
# --------------------------------------------------

@app.get("/api/dashboard")
def get_dashboard():
    conn = get_connection()

    stats = conn.execute(
        """
        SELECT
            COUNT(*) AS total_trips,
            COALESCE(AVG(eco_score), 0) AS average_score,
            COALESCE(SUM(co2), 0) AS total_co2,
            COALESCE(AVG(efficiency), 0) AS average_efficiency,
            COALESCE(SUM(eco_score), 0) AS total_points
        FROM trips
        """
    ).fetchone()

    date_rows = conn.execute(
        """
        SELECT DISTINCT DATE(created_at) AS trip_date
        FROM trips
        ORDER BY trip_date DESC
        """
    ).fetchall()

    conn.close()

    # --------------------------------------------
    # Calculate current streak
    # --------------------------------------------

    trip_dates = [row["trip_date"] for row in date_rows]

    streak = 0

    if trip_dates:
        today = datetime.now().date()

        dates = [
            datetime.strptime(date, "%Y-%m-%d").date()
            for date in trip_dates
        ]

        # Start from today if a trip exists today.
        # Otherwise allow the streak to start from yesterday.
        if dates[0] == today:
            current_date = today
        elif dates[0] == today - timedelta(days=1):
            current_date = today - timedelta(days=1)
        else:
            current_date = None

        if current_date:
            for date in dates:
                if date == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                elif date < current_date:
                    break

    # --------------------------------------------
    # Eco challenge
    # --------------------------------------------

    # Challenge:
    # Complete 5 trips with an Eco Score >= 80
    challenge_target = 5

    conn = get_connection()

    challenge_row = conn.execute(
        """
        SELECT COUNT(*) AS completed
        FROM trips
        WHERE eco_score >= 80
        """
    ).fetchone()

    conn.close()

    challenge_progress = min(
        challenge_row["completed"],
        challenge_target
    )

    return {
        "total_trips": stats["total_trips"],
        "average_score": round(stats["average_score"], 2),
        "total_co2": round(stats["total_co2"], 2),
        "average_efficiency": round(stats["average_efficiency"], 2),
        "total_points": int(stats["total_points"]),
        "streak": streak,
        "challenge": {
            "title": "Eco Champion",
            "description": "Complete 5 trips with an Eco Score of 80 or higher.",
            "progress": challenge_progress,
            "target": challenge_target,
            "completed": challenge_progress >= challenge_target,
        },
    }