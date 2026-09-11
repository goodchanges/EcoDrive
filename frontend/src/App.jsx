import { useEffect, useState } from "react";
import axios from "axios";
import Auth from "./Auth";
import { supabase } from "./supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://localhost:8000";

const ROUTES = [
  "City Center → Airport",
  "Airport → City Center",
  "City Center → Railway Station",
  "Railway Station → City Center",
  "Home → Office",
  "Office → Home",
  "Home → College",
  "College → Home",
  "Custom Route",
];

function App() {
  // --------------------------------------------------
  // Authentication state
  // --------------------------------------------------

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --------------------------------------------------
  // Trip form state
  // --------------------------------------------------

  const [formData, setFormData] = useState({
    distance: "",
    fuel: "",
    average_speed: "",
    idle_time: "",
    harsh_braking: "",
    harsh_acceleration: "",
  });

  // --------------------------------------------------
  // Dashboard state
  // --------------------------------------------------

  const [dashboard, setDashboard] = useState(null);
  const [trips, setTrips] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [result, setResult] = useState(null);
  const [ecoTips, setEcoTips] = useState([]);
  const [evComparison, setEvComparison] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState("");

  // --------------------------------------------------
  // Check Supabase authentication
  // --------------------------------------------------

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------
  // Calculate current driving streak
  // --------------------------------------------------

  const calculateStreak = (tripsData) => {
    if (!tripsData.length) {
      return 0;
    }

    const uniqueDates = [
      ...new Set(
        tripsData.map((trip) =>
          new Date(trip.created_at).toLocaleDateString("en-CA")
        )
      ),
    ]
      .map((date) => new Date(date))
      .sort((a, b) => b - a);

    if (!uniqueDates.length) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const currentDate = new Date(uniqueDates[0]);
    currentDate.setHours(0, 0, 0, 0);

    // No active streak if latest trip wasn't today or yesterday
    if (
      currentDate.getTime() !== today.getTime() &&
      currentDate.getTime() !== yesterday.getTime()
    ) {
      return 0;
    }

    let streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const previousDate = uniqueDates[i - 1];
      const date = uniqueDates[i];

      const difference =
        (previousDate - date) /
        (1000 * 60 * 60 * 24);

      if (difference === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  // --------------------------------------------------
  // Generate personalized eco-driving tips
  // --------------------------------------------------

  const generateEcoTips = (tripData, score) => {
    const tips = [];

    const efficiency =
      tripData.distance / tripData.fuel;

    // Fuel efficiency
    if (efficiency < 10) {
      tips.push(
        "Your fuel efficiency is low. Try smoother acceleration and avoid unnecessary idling."
      );
    } else if (efficiency < 15) {
      tips.push(
        "Your fuel efficiency has room for improvement. Try maintaining a steady speed and accelerating gradually."
      );
    }

    // Speed
    if (tripData.average_speed > 80) {
      tips.push(
        "Try maintaining a more moderate and steady speed to improve fuel efficiency."
      );
    }

    // Idle time
    if (tripData.idle_time > 10) {
      tips.push(
        "You spent a lot of time idling. Switch off the engine during longer stops when practical."
      );
    }

    // Harsh braking
    if (tripData.harsh_braking > 0) {
      tips.push(
        `You had ${tripData.harsh_braking} harsh braking event${
          tripData.harsh_braking > 1 ? "s" : ""
        }. Keep more following distance to reduce sudden braking.`
      );
    }

    // Harsh acceleration
    if (tripData.harsh_acceleration > 0) {
      tips.push(
        `You had ${tripData.harsh_acceleration} harsh acceleration event${
          tripData.harsh_acceleration > 1 ? "s" : ""
        }. Accelerate more gradually to improve efficiency.`
      );
    }

    // High score
    if (score >= 90) {
      tips.push(
        "Excellent driving! Keep maintaining smooth acceleration, steady speed, and low idle time."
      );
    } else if (score >= 80) {
      tips.push(
        "Good job! Focus on the areas above to push your Eco Score even higher."
      );
    }

    // Fallback
    if (tips.length === 0) {
      tips.push(
        "Great trip! Your driving metrics look efficient. Keep up the good work."
      );
    }

    return tips.slice(0, 4);
  };

  // --------------------------------------------------
  // Calculate EV vs ICE comparison
  // --------------------------------------------------

  const calculateEVComparison = (
    distance,
    iceFuel,
    iceCo2
  ) => {
    // Simple prototype assumption:
    // EV consumes approximately 15 kWh per 100 km.
    const evEnergy = distance * 0.15;

    return {
      iceFuel: Number(iceFuel.toFixed(2)),
      iceCo2: Number(iceCo2.toFixed(2)),
      evEnergy: Number(evEnergy.toFixed(2)),
      evTailpipeCo2: 0,
    };
  };

  // --------------------------------------------------
  // Fetch dashboard + trips + leaderboard
  // --------------------------------------------------

  const fetchDashboardData = async () => {
    try {
      setError("");

      if (!user) {
        return;
      }

      // ----------------------------------------------
      // Get only trips belonging to logged-in user
      // ----------------------------------------------

      const {
        data: userTrips,
        error: tripsError,
      } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (tripsError) {
        throw tripsError;
      }

      const tripsData = userTrips || [];

      setTrips(tripsData);

      // ----------------------------------------------
      // Get real leaderboard
      // ----------------------------------------------

      const {
        data: leaderboardData,
        error: leaderboardError,
      } = await supabase
        .from("profiles")
        .select("id, display_name, total_points")
        .order("total_points", {
          ascending: false,
        });

      if (leaderboardError) {
        throw leaderboardError;
      }

      setLeaderboard(leaderboardData || []);

      // ----------------------------------------------
      // Dashboard statistics
      // ----------------------------------------------

      const totalTrips = tripsData.length;

      const averageScore =
        totalTrips > 0
          ? tripsData.reduce(
              (sum, trip) =>
                sum + Number(trip.eco_score),
              0
            ) / totalTrips
          : 0;

      const totalCo2 = tripsData.reduce(
        (sum, trip) => sum + Number(trip.co2),
        0
      );

      const averageEfficiency =
        totalTrips > 0
          ? tripsData.reduce(
              (sum, trip) =>
                sum + Number(trip.efficiency),
              0
            ) / totalTrips
          : 0;

      const totalPoints = tripsData.reduce(
        (sum, trip) =>
          sum + Number(trip.eco_score),
        0
      );

      // ----------------------------------------------
      // Eco challenge
      // ----------------------------------------------

      const challengeProgress = Math.min(
        tripsData.filter(
          (trip) =>
            Number(trip.eco_score) >= 80
        ).length,
        5
      );

      // ----------------------------------------------
      // Set dashboard
      // ----------------------------------------------

      setDashboard({
        total_trips: totalTrips,
        average_score: Number(
          averageScore.toFixed(2)
        ),
        total_co2: Number(
          totalCo2.toFixed(2)
        ),
        average_efficiency: Number(
          averageEfficiency.toFixed(2)
        ),
        total_points: totalPoints,
        streak: calculateStreak(tripsData),

        challenge: {
          title: "Eco Champion",
          description:
            "Complete 5 trips with an Eco Score of 80 or higher.",
          progress: challengeProgress,
          target: 5,
          completed:
            challengeProgress >= 5,
        },
      });
    } catch (error) {
      console.error(error);
      setError(
        error.message ||
          "Unable to load your trip data."
      );
    }
  };

  // --------------------------------------------------
  // Load dashboard after authentication
  // --------------------------------------------------

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // --------------------------------------------------
  // Form handling
  // --------------------------------------------------

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // --------------------------------------------------
  // Add trip
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);
    setEcoTips([]);
    setEvComparison(null);
    setLoading(true);

    try {
      if (!user) {
        throw new Error(
          "You must be logged in to add a trip."
        );
      }

      const tripData = {
        route: route,
        distance: Number(formData.distance),
        fuel: Number(formData.fuel),
        average_speed: Number(
          formData.average_speed
        ),
        idle_time: Number(formData.idle_time),
        harsh_braking: Number(
          formData.harsh_braking
        ),
        harsh_acceleration: Number(
          formData.harsh_acceleration
        ),
      };

      // ----------------------------------------------
      // 1. Calculate using FastAPI
      // ----------------------------------------------

      const calculationResponse =
        await axios.post(
          `${API_URL}/api/calculate-trip`,
          tripData
        );

      const metrics =
        calculationResponse.data;

      // ----------------------------------------------
      // 2. Save trip to Supabase
      // ----------------------------------------------

      const {
        error: insertError,
      } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          route: tripData.route,
          distance: tripData.distance,
          fuel: tripData.fuel,
          average_speed:
            tripData.average_speed,
          idle_time: tripData.idle_time,
          harsh_braking:
            tripData.harsh_braking,
          harsh_acceleration:
            tripData.harsh_acceleration,
          efficiency:
            metrics.efficiency,
          eco_score:
            metrics.score,
          co2:
            metrics.co2,
        });

      if (insertError) {
        throw insertError;
      }

      // ----------------------------------------------
      // 3. Show result
      // ----------------------------------------------

      setResult({
        score: metrics.score,
        efficiency:
          metrics.efficiency,
        co2: metrics.co2,
      });

      setEcoTips(
        generateEcoTips(tripData, metrics.score)
      );

      setEvComparison(
        calculateEVComparison(
          tripData.distance,
          tripData.fuel,
          metrics.co2
        )
      );

      // ----------------------------------------------
      // 4. Clear form
      // ----------------------------------------------

      setFormData({
        distance: "",
        fuel: "",
        average_speed: "",
        idle_time: "",
        harsh_braking: "",
        harsh_acceleration: "",
      });
      setRoute("");

      // ----------------------------------------------
      // 5. Refresh dashboard + leaderboard
      // ----------------------------------------------

      await fetchDashboardData();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Could not save the trip."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const handleLogout = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(error);
      return;
    }

    setUser(null);
  };

  // --------------------------------------------------
  // Weekly eco report
  // --------------------------------------------------

  const getWeeklyReport = (tripsData) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const weeklyTrips = tripsData.filter((trip) => {
      const tripDate = new Date(trip.created_at);
      return tripDate >= sevenDaysAgo && tripDate <= now;
    });

    if (weeklyTrips.length === 0) {
      return {
        totalTrips: 0,
        averageScore: 0,
        totalCo2: 0,
        averageEfficiency: 0,
        bestScore: 0,
        message:
          "No trips recorded in the last 7 days. Add a trip to start your weekly report.",
      };
    }

    const averageScore =
      weeklyTrips.reduce(
        (sum, trip) => sum + Number(trip.eco_score),
        0
      ) / weeklyTrips.length;

    const totalCo2 = weeklyTrips.reduce(
      (sum, trip) => sum + Number(trip.co2),
      0
    );

    const averageEfficiency =
      weeklyTrips.reduce(
        (sum, trip) => sum + Number(trip.efficiency),
        0
      ) / weeklyTrips.length;

    const bestScore = Math.max(
      ...weeklyTrips.map((trip) => Number(trip.eco_score))
    );

    let message =
      "Keep building your eco-driving habits this week.";

    if (averageScore >= 90) {
      message =
        "Excellent week! Your driving performance was highly eco-friendly.";
    } else if (averageScore >= 80) {
      message =
        "Great week! Keep focusing on smooth acceleration and steady speeds.";
    } else if (averageScore < 60) {
      message =
        "There is room to improve. Focus on reducing idling, harsh braking, and harsh acceleration.";
    }

    return {
      totalTrips: weeklyTrips.length,
      averageScore: Number(averageScore.toFixed(2)),
      totalCo2: Number(totalCo2.toFixed(2)),
      averageEfficiency: Number(averageEfficiency.toFixed(2)),
      bestScore,
      message,
    };
  };

  // --------------------------------------------------
  // Chart data
  // --------------------------------------------------

  const weeklyReport = getWeeklyReport(trips);

  const chartData = trips
    .slice(0, 7)
    .reverse()
    .map((trip, index) => ({
      name: `Trip ${index + 1}`,
      score: Number(trip.eco_score),
    }));

  // --------------------------------------------------
  // Authentication loading screen
  // --------------------------------------------------

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">
            🚗🌱
          </div>

          <p className="text-gray-600">
            Loading EcoDrive...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Not logged in
  // --------------------------------------------------

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <h1 className="text-3xl font-bold text-green-700">
                EcoDrive 🚗🌱
              </h1>

              <p className="text-gray-600 mt-1">
                Your smarter, greener driving companion.
              </p>
            </div>

            <div className="flex items-center gap-4">

              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Signed in as
                </p>

                <p className="font-semibold text-gray-800">
                  {user.user_metadata
                    ?.display_name ||
                    user.email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
              >
                Logout
              </button>

            </div>

          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          {/* Average Score */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">
              Average Eco Score
            </p>

            <p className="text-4xl font-bold text-green-600 mt-2">
              {dashboard?.average_score ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              out of 100
            </p>
          </div>

          {/* Total CO2 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">
              Total CO₂
            </p>

            <p className="text-4xl font-bold mt-2">
              {dashboard?.total_co2 ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              kg estimated
            </p>
          </div>

          {/* Efficiency */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">
              Avg. Efficiency
            </p>

            <p className="text-4xl font-bold mt-2">
              {dashboard?.average_efficiency ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              km/L
            </p>
          </div>

          {/* Streak */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">
              Current Streak 🔥
            </p>

            <p className="text-4xl font-bold mt-2 text-orange-500">
              {dashboard?.streak ?? 0}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              consecutive days
            </p>
          </div>

        </section>

        {/* Chart */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">

          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Eco Performance 📊
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Your most recent trip scores.
            </p>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />

                <Bar
                  dataKey="score"
                  fill="#16a34a"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              Add your first trip to see your performance chart.
            </div>
          )}

        </section>

        {/* Weekly Eco Report */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              📅 Weekly Eco Report
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Your driving performance over the last 7 days.
            </p>
          </div>

          {weeklyReport.totalTrips > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-5">
                  <p className="text-gray-500 text-sm">
                    Trips This Week
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {weeklyReport.totalTrips}
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-5">
                  <p className="text-gray-500 text-sm">
                    Average Eco Score
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {weeklyReport.averageScore}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <p className="text-gray-500 text-sm">
                    CO₂ This Week
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {weeklyReport.totalCo2} kg
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <p className="text-gray-500 text-sm">
                    Avg. Efficiency
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {weeklyReport.averageEfficiency} km/L
                  </p>
                </div>
              </div>

              <div className="mt-5 bg-green-50 rounded-xl p-5">
                <p className="text-gray-700">
                  🏆 Best Eco Score this week:{" "}
                  <span className="font-semibold">
                    {weeklyReport.bestScore}
                  </span>
                </p>

                <p className="text-gray-700 mt-2">
                  🌱 {weeklyReport.message}
                </p>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 rounded-xl p-5 text-gray-600">
              {weeklyReport.message}
            </div>
          )}
        </section>

        {/* Recent Trips */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">

          <h2 className="text-xl font-semibold mb-5">
            Recent Trips 🚗
          </h2>

          {trips.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="py-3">
                      Date
                    </th>

                    <th className="py-3">
                      Route
                    </th>

                    <th className="py-3">
                      Distance
                    </th>

                    <th className="py-3">
                      Efficiency
                    </th>

                    <th className="py-3">
                      Score
                    </th>

                    <th className="py-3">
                      CO₂
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {trips.map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b last:border-b-0"
                    >

                      <td className="py-4">
                        {new Date(
                          trip.created_at
                        ).toLocaleDateString()}
                      </td>

                      <td className="py-4">
                        {trip.route || "Not specified"}
                      </td>

                      <td className="py-4">
                        {trip.distance} km
                      </td>

                      <td className="py-4">
                        {trip.efficiency} km/L
                      </td>

                      <td className="py-4 font-semibold text-green-600">
                        {trip.eco_score}
                      </td>

                      <td className="py-4">
                        {trip.co2} kg
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          ) : (
            <p className="text-gray-500">
              No trips recorded yet.
            </p>
          )}

        </section>

        {/* Gamification */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Challenge */}
          <div className="bg-white rounded-2xl shadow-sm p-6">

            <div className="flex items-center justify-between mb-4">

              <h2 className="text-xl font-semibold">
                🎯 Eco Challenge
              </h2>

              {dashboard?.challenge?.completed && (
                <span className="text-green-600 font-semibold">
                  Completed ✓
                </span>
              )}

            </div>

            <p className="text-gray-600 mb-4">
              {dashboard?.challenge
                ?.description ||
                "Complete 5 trips with an Eco Score of 80 or higher."}
            </p>

            <div className="flex justify-between text-sm mb-2">

              <span>
                Progress
              </span>

              <span className="font-semibold">
                {dashboard?.challenge
                  ?.progress ?? 0}{" "}
                /{" "}
                {dashboard?.challenge
                  ?.target ?? 5}
              </span>

            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">

              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{
                  width: `${
                    Math.min(
                      (
                        (dashboard?.challenge
                          ?.progress ?? 0) /
                        (dashboard?.challenge
                          ?.target ?? 5)
                      ) * 100,
                      100
                    )
                  }%`,
                }}
              />

            </div>

          </div>

          {/* Real Leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm p-6">

            <h2 className="text-xl font-semibold mb-5">
              🏆 Leaderboard
            </h2>

            <div className="space-y-4">

              {leaderboard.length > 0 ? (
                leaderboard.map(
                  (person, index) => {
                    const isCurrentUser =
                      person.id === user.id;

                    return (
                      <div
                        key={person.id}
                        className={`flex items-center justify-between ${
                          isCurrentUser
                            ? "bg-green-50 rounded-lg px-3 py-2"
                            : ""
                        }`}
                      >

                        <div className="flex items-center gap-3">

                          <span className="text-xl">
                            {index === 0
                              ? "🥇"
                              : index === 1
                              ? "🥈"
                              : index === 2
                              ? "🥉"
                              : `#${index + 1}`}
                          </span>

                          <span className="font-medium">
                            {person.display_name ||
                              "Anonymous"}

                            {isCurrentUser && (
                              <span className="text-green-600 text-sm ml-2">
                                (You)
                              </span>
                            )}
                          </span>

                        </div>

                        <span className="font-semibold">
                          {person.total_points} pts
                        </span>

                      </div>
                    );
                  }
                )
              ) : (
                <p className="text-gray-500">
                  No players yet.
                </p>
              )}

            </div>

          </div>

        </section>

        {/* Add Trip */}
        <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">

          <h2 className="text-2xl font-semibold mb-2">
            Add New Trip
          </h2>

          <p className="text-gray-500 mb-6">
            Enter your trip details to calculate your eco score.
          </p>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >

            {/* Route */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Route
              </label>

              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              >
                <option value="">Select a route</option>

                {ROUTES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Distance */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Distance (km)
              </label>

              <input
                type="number"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                min="0.1"
                step="0.1"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="20"
              />
            </div>

            {/* Fuel */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Fuel Used (L)
              </label>

              <input
                type="number"
                name="fuel"
                value={formData.fuel}
                onChange={handleChange}
                min="0.1"
                step="0.1"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="1.5"
              />
            </div>

            {/* Average speed */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Average Speed (km/h)
              </label>

              <input
                type="number"
                name="average_speed"
                value={
                  formData.average_speed
                }
                onChange={handleChange}
                min="0"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="45"
              />
            </div>

            {/* Idle time */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Idle Time (minutes)
              </label>

              <input
                type="number"
                name="idle_time"
                value={formData.idle_time}
                onChange={handleChange}
                min="0"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="5"
              />
            </div>

            {/* Harsh braking */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Harsh Braking Events
              </label>

              <input
                type="number"
                name="harsh_braking"
                value={
                  formData.harsh_braking
                }
                onChange={handleChange}
                min="0"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="2"
              />
            </div>

            {/* Harsh acceleration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Harsh Acceleration Events
              </label>

              <input
                type="number"
                name="harsh_acceleration"
                value={
                  formData.harsh_acceleration
                }
                onChange={handleChange}
                min="0"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                placeholder="1"
              />
            </div>

            {/* Submit */}
            <div className="md:col-span-2">

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
              >
                {loading
                  ? "Saving Trip..."
                  : "Calculate Eco Score"}
              </button>

            </div>

          </form>

          {/* Error */}
          {error && (
            <div className="mt-5 bg-red-100 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-green-50 rounded-xl p-5">
                <p className="text-gray-500">
                  Eco Score
                </p>

                <p className="text-3xl font-bold text-green-600">
                  {result.score}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-gray-500">
                  Efficiency
                </p>

                <p className="text-3xl font-bold">
                  {result.efficiency} km/L
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-gray-500">
                  CO₂
                </p>

                <p className="text-3xl font-bold">
                  {result.co2} kg
                </p>
              </div>

              {ecoTips.length > 0 && (
                <div className="md:col-span-3 mt-4 bg-green-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-green-800 mb-4">
                    💡 Personalized Eco Tips
                  </h3>

                  <div className="space-y-3">
                    {ecoTips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-white rounded-lg p-4"
                      >
                        <span className="text-lg">🌱</span>

                        <p className="text-gray-700">
                          {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evComparison && (
                <div className="md:col-span-3 mt-4 bg-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-blue-800 mb-4">
                    ⚡ EV vs ICE Comparison
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-blue-200">
                          <th className="py-3">Metric</th>
                          <th className="py-3">ICE 🚗</th>
                          <th className="py-3">EV ⚡</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="border-b border-blue-100">
                          <td className="py-3 font-medium">
                            Energy / Fuel
                          </td>

                          <td className="py-3">
                            {evComparison.iceFuel} L
                          </td>

                          <td className="py-3">
                            {evComparison.evEnergy} kWh
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3 font-medium">
                            CO₂
                          </td>

                          <td className="py-3">
                            {evComparison.iceCo2} kg
                          </td>

                          <td className="py-3 text-green-600 font-semibold">
                            0 kg tailpipe
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-sm text-gray-600 mt-4">
                    EV energy use is estimated at 15 kWh per 100 km.
                    This prototype comparison shows tailpipe CO₂ only and
                    does not include electricity-generation emissions.
                  </p>
                </div>
              )}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default App;