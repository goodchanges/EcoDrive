# EcoDrive 🚗🌱

EcoDrive is a full-stack eco-driving and carbon-footprint tracking application that helps drivers understand their driving efficiency, estimate CO₂ emissions, improve their eco-driving score, and compete through a multi-user leaderboard.

## Features

- 🔐 User registration and login using Supabase Authentication
- 🚗 User-specific trip tracking
- 📊 Eco-driving score calculation
- ⛽ Fuel efficiency calculation
- 🌍 CO₂ emission estimation
- 📈 Eco performance chart
- 🎯 Eco-driving challenge system
- 🔥 Daily driving streak
- 🏆 Dynamic multi-user leaderboard
- 👤 Separate data for each authenticated user
- 🔒 Row Level Security using Supabase
- ⚡ FastAPI backend for trip calculations

## How It Works

A user logs into EcoDrive and enters trip information such as:

- Distance traveled
- Fuel used
- Average speed
- Idle time
- Harsh braking events
- Harsh acceleration events

The frontend sends the trip data to the FastAPI backend.

FastAPI calculates:

- Fuel efficiency
- Estimated CO₂ emissions
- Eco score

The calculated trip is then stored in Supabase and associated with the currently authenticated user.

The dashboard uses the user's stored trips to calculate their:

- Average eco score
- Total CO₂
- Average efficiency
- Trip history
- Eco challenge progress
- Driving streak

A shared leaderboard displays users ranked by their total eco points.

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- Recharts

### Backend
- Python
- FastAPI
- Pydantic

### Database & Authentication
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Development
- Git
- GitHub
- VS Code

## Project Structure

```text
EcoDrive/
│
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
│   │
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md