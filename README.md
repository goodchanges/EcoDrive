# EcoDrive 🚗🌱

EcoDrive is a full-stack eco-driving and carbon-footprint coaching application. Users can create an account, record trips with route and driving data, receive an Eco Score and CO₂ estimate, track their personal driving performance, receive personalized eco-driving tips, compare EV and ICE estimates, review weekly performance, complete an eco challenge, maintain a driving streak, and compete on a live multi-user leaderboard.

## Features

🔐 Supabase email/password authentication

👤 User-specific trip history

🛣️ Route selection and trip route tracking

📊 Eco Score calculation

⛽ Fuel-efficiency calculation

🌍 Estimated CO₂ emissions

📈 Eco performance chart

💡 Personalized eco-driving tips

⚡ EV vs ICE comparison

📅 Weekly eco performance report

🔥 Daily driving streak

🎯 Eco Champion challenge

🏆 Dynamic multi-user leaderboard

🔒 Supabase Row Level Security (RLS)

⚡ FastAPI calculation API

## Tech Stack

### Frontend

React

Vite

JavaScript

Tailwind CSS

Axios

Recharts

### Backend

Python

FastAPI

Pydantic

Uvicorn

### Database & Authentication

Supabase PostgreSQL

Supabase Auth

Supabase Row Level Security (RLS)

## Architecture

```text
React + Vite
│
├── Supabase Auth ───────► User login/session
│
├── Axios ───────────────► FastAPI
│                            └── Calculates efficiency, CO₂ and Eco Score
│
└── Supabase Client ─────► PostgreSQL
                             ├── profiles
                             └── trips
Project Structure
EcoDrive/
├── backend/
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Auth.jsx
│   │   ├── supabaseClient.js
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
Run Locally
Prerequisites

Python 3

Node.js and npm

A Supabase project

1. Clone the repository
git clone https://github.com/goodchanges/EcoDrive.git
cd EcoDrive
2. Configure Supabase

Create a Supabase project and enable email/password authentication.

Configure:

A profiles table
A trips table
Row Level Security policies for user-specific trips and leaderboard access
A trigger that creates a profile when a new auth user is created
A trigger that adds a trip's eco_score to the user's total_points

The application uses the following tables.

profiles
id              uuid
display_name    text
total_points    integer
created_at      timestamptz

The id references the authenticated Supabase user's ID.

trips
id                  bigint
user_id             uuid
route               text
distance            numeric
fuel                numeric
average_speed       numeric
idle_time           numeric
harsh_braking       integer
harsh_acceleration  integer
efficiency          numeric
eco_score           integer
co2                 numeric
created_at          timestamptz
3. Backend

Open a terminal in the project root:

cd backend

Create a virtual environment:

python -m venv venv

Windows PowerShell:

.\venv\Scripts\Activate.ps1

Install dependencies:

pip install -r requirements.txt

Start FastAPI:

uvicorn main:app --reload

Backend:

http://localhost:8000

Interactive API docs:

http://localhost:8000/docs
4. Frontend

Open a second terminal:

cd frontend

Install dependencies:

npm install

Create:

frontend/.env.local

Add:

VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

Do not commit .env.local to GitHub.

Start the frontend:

npm run dev

Vite will show the local URL in the terminal, typically:

http://localhost:5173

or another available local port such as:

http://localhost:5174
How the Trip Flow Works

The user logs into EcoDrive with Supabase Auth.

The user selects a route and enters trip details in React.

React sends the trip data to FastAPI.

FastAPI calculates:

fuel efficiency
estimated CO₂
Eco Score

React stores the calculated trip in Supabase with the authenticated user's user_id.

Supabase RLS ensures users only access their own trip records.

The dashboard displays the user's statistics, trip history, performance chart, challenge progress, and driving streak.

The leaderboard reads accumulated user totals from the profiles table.

Personalized eco-tips are generated from the user's trip metrics.

An EV vs ICE comparison is generated for the same trip distance.

The weekly report summarizes the user's performance over the previous 7 days.

Eco Score

The prototype score starts at 100 and applies rule-based penalties for:

low fuel efficiency
higher average speed
excessive idle time
harsh braking
harsh acceleration

The final score is constrained to a range of 0–100.

The scoring system is intentionally transparent and rule-based so that users and evaluators can easily understand how the score is calculated.

CO₂ Estimate

For this prototype, gasoline emissions are estimated using:

CO₂ (kg) = fuel used (L) × 2.31

This is a simplified estimate for the project and is not intended to represent vehicle-specific or real-time emissions measurement.

Personalized Eco Tips

EcoDrive generates personalized eco-driving recommendations based on the user's actual trip metrics.

Tips can be generated based on:

fuel efficiency
average speed
idle time
harsh braking
harsh acceleration
Eco Score

The recommendation system is rule-based rather than AI-generated.

EV vs ICE Comparison

EcoDrive compares the recorded ICE trip with an estimated EV energy requirement for the same distance.

The prototype uses the following simplified assumption:

EV energy ≈ 15 kWh per 100 km

The comparison displays:

ICE fuel consumed
ICE estimated CO₂
Estimated EV electricity consumption
EV tailpipe CO₂

The EV CO₂ value represents tailpipe emissions only and does not include emissions associated with electricity generation.

Weekly Eco Report

The weekly report summarizes trips recorded during the previous 7 days.

It includes:

number of trips
average Eco Score
total estimated CO₂
average fuel efficiency
best Eco Score
a short weekly performance summary
Gamification
Daily Streak

The driving streak is based on consecutive calendar days on which the user records a trip.

Eco Champion Challenge

The default challenge is:

Complete 5 trips with an Eco Score of 80 or higher.
Leaderboard

The leaderboard ranks users based on accumulated Eco Score points stored in the profiles table.

Assumptions

Trip data is manually entered for the assessment prototype.

Route information is captured through user selection/manual entry rather than live GPS tracking.

The application does not currently collect data directly from phone sensors or vehicle telemetry.

Distance is measured in kilometers and fuel is measured in liters.

The Eco Score is a transparent rule-based model rather than a machine-learning model.

The leaderboard is based on accumulated Eco Score points.

EV energy consumption is estimated using a simplified benchmark of 15 kWh per 100 km.

EV CO₂ in the comparison represents tailpipe emissions only.

Weekly reports summarize the previous 7 days of recorded trips.

The application is designed to run locally for the assessment; production deployment is not required.

Security

Supabase Auth manages user sessions.

The Supabase publishable key is used by the frontend.

RLS policies protect user-specific trip data.

Users cannot access another user's private trip records.

Secret/service-role keys must never be exposed or committed to GitHub.

.env.local is excluded through .gitignore.

Future Improvements

GPS-based route tracking

Real-time trip tracking

Automatic harsh-driving event detection using vehicle or phone telemetry

Vehicle profiles

More advanced driving analytics

Production deployment

GitHub Repository

https://github.com/goodchanges/EcoDrive