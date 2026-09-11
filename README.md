


EcoDrive 🚗🌱
EcoDrive is a full-stack eco-driving and carbon-footprint coaching application. Users can create an account, record trips, receive an Eco Score and CO₂ estimate, track their personal driving performance, complete an eco challenge, maintain a driving streak, and compete on a live multi-user leaderboard.

Features
🔐 Supabase email/password authentication

👤 User-specific trip history

📊 Eco Score calculation

⛽ Fuel-efficiency calculation

🌍 Estimated CO₂ emissions

📈 Eco performance chart

🔥 Daily driving streak

🎯 Eco Champion challenge

🏆 Dynamic multi-user leaderboard

🔒 Supabase Row Level Security (RLS)

⚡ FastAPI calculation API

Tech Stack
Frontend
React

Vite

JavaScript

Tailwind CSS

Axios

Recharts

Backend
Python

FastAPI

Pydantic

Uvicorn

Database & Authentication
Supabase PostgreSQL

Supabase Auth

Supabase Row Level Security (RLS)

Architecture
React + Vite
    │
    ├── Supabase Auth ───────► User login/session
    │
    └── Axios
          │
          ▼
      FastAPI
          │
          └── Calculates efficiency, CO₂ and Eco Score

React
    │
    └── Supabase Client ─────► PostgreSQL
                                │
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
Create a Supabase project and configure:

Email/password authentication

A profiles table

A trips table

Row Level Security policies for user-specific trips and leaderboard access

A trigger that creates a profile when a new auth user is created

A trigger that adds a trip's eco_score to the user's total_points

The application expects these tables:

profiles
id              uuid  (references auth.users.id)
display_name    text
total_points    integer
created_at      timestamptz
trips
id                  bigint
user_id             uuid
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
cd backend
python -m venv venv
Windows PowerShell
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
npm install
Create:

frontend/.env.local
Add:

VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
Do not commit .env.local to GitHub.

Start the frontend:

npm run dev
Vite will show the local URL, typically:

http://localhost:5173
or another available local port such as:

http://localhost:5174
How the Trip Flow Works
The user logs into EcoDrive with Supabase Auth.

The user enters trip details in React.

React sends the trip data to FastAPI.

FastAPI calculates:

fuel efficiency

estimated CO₂

Eco Score

React stores the calculated trip in Supabase with the authenticated user's user_id.

Supabase RLS ensures users only access their own trip records.

The dashboard recalculates the user's statistics, challenge progress and streak.

The leaderboard reads user totals from the profiles table.

Eco Score
The prototype score starts at 100 and applies rule-based penalties for:

low fuel efficiency

higher average speed

excessive idle time

harsh braking

harsh acceleration

The final score is constrained to a range of 0–100.

CO₂ Estimate
For this prototype, gasoline emissions are estimated using:

CO₂ (kg) = fuel used (L) × 2.31
This is a simplified estimate for the project and is not intended to represent vehicle-specific or real-time emissions measurement.

Assumptions
Trip data is manually entered for the assessment prototype.

The application does not currently collect data directly from phone sensors or vehicle telemetry.

The Eco Score is a transparent rule-based model rather than a machine-learning model.

The leaderboard is based on accumulated Eco Score points.

The application is designed to run locally for the assessment; production deployment is not required.

Security
Supabase Auth manages user sessions.

The Supabase publishable key is used by the frontend.

RLS policies protect user-specific trip data.

Secret keys and local environment files must never be committed to GitHub.

Future Improvements
Phone GPS and sensor integration

Automatic harsh-driving event detection

Real-time trip tracking

Personalized eco-driving recommendations

Weekly reports

Vehicle profiles

Production deployment

GitHub
Repository:

https://github.com/goodchanges/EcoDrive

Assessment
Built as a full-stack development project for the IgnitionAI Full-Stack Development Internship assessment.