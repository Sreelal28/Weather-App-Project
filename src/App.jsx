import React, { useState, useEffect } from "react";
import WeatherLogo from "./assets/cloud.png";
import moment from "moment";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
export default function App() {
  const [time, setTime] = useState(moment());
  const [weatherData, setWeatherData] = useState(null);
  const [startHourIndex, setStartHourIndex] = useState(0);
  const [coordinates, setCoordinates] = useState({ lat: 28.625, lon: 77.25 });
  const [forecastLocation, setForecastLocation] = useState(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const fetchWeather = async (lat = 28.625, lon = 77.25) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,surface_pressure,cloud_cover,relative_humidity_2m,apparent_temperature,precipitation_probability,visibility,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_min,apparent_temperature_max,sunrise,sunset,wind_direction_10m_dominant,wind_speed_10m_max,precipitation_sum&timezone=auto&forecast_days=8`;
      const res = await fetch(url);
      const data = await res.json();
      const hourlyTime = data.hourly.time.map((t) => new Date(t));
      const dailyTime = data.daily.time.map((t) => new Date(t));
      const weatherData = {
        hourly: {
          time: hourlyTime,
          temperature2m: data.hourly.temperature_2m,
          weatherCode: data.hourly.weather_code,
          surfacePressure: data.hourly.surface_pressure,
          cloudCover: data.hourly.cloud_cover,
          humidity: data.hourly.relative_humidity_2m,
          apparentTemperature: data.hourly.apparent_temperature,
          precipitationProbability: data.hourly.precipitation_probability,
          visibility: data.hourly.visibility,
          windSpeed10m: data.hourly.wind_speed_10m,
          windDirection: data.hourly.wind_direction_10m,
        },
        daily: {
          time: dailyTime,
          weatherCode: data.daily.weather_code,
          temperature2mMax: data.daily.temperature_2m_max,
          temperature2mMin: data.daily.temperature_2m_min,
          apparentTemperatureMin: data.daily.apparent_temperature_min,
          apparentTemperatureMax: data.daily.apparent_temperature_max,
          sunrise: data.daily.sunrise.map((t) => new Date(t)),
          sunset: data.daily.sunset.map((t) => new Date(t)),
          windDirection10mDominant: data.daily.wind_direction_10m_dominant,
          windSpeed10mMax: data.daily.wind_speed_10m_max,
          precipitationSum: data.daily.precipitation_sum,
        },
      };
      weatherData.lat = lat;
      weatherData.lon = lon;
      setWeatherData(weatherData);
    } catch (err) {
      console.error("Error fetching weather:", err);
      alert("Failed to fetch weather data.");
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      if (!coordinates.lat || !coordinates.lon) return;
      try {
        await fetchWeather(coordinates.lat, coordinates.lon);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse.php?lat=${coordinates.lat}&lon=${coordinates.lon}&zoom=18&format=jsonv2`
        );
        const location = await res.json();
        console.log("Reverse geocoding response:", location);
        if (location?.address) {
          const locationLabel =
            location?.address?.city ||
            location?.address?.village ||
            location?.address?.town ||
            location?.address?.state_district;
          const state = location?.address?.state;
          const country = location?.address?.country;
          if (locationLabel && state && country) {
            const displayLocation =
              locationLabel !== state
                ? `${locationLabel}, ${state}, ${country}`
                : `${locationLabel}, ${country}`;
            setForecastLocation(displayLocation);
          } else if (locationLabel && country) {
            setForecastLocation(`${locationLabel}, ${country}`);
          } else if (country) {
            setForecastLocation(country);
          } else {
            setForecastLocation("Location not found");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to fetch weather/location info.");
      }
    };
    fetchData();
  }, [coordinates]);
  useEffect(() => {
    const getInitialLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCoordinates({ lat: latitude, lon: longitude });
          },
          (error) => {
            console.warn("Geolocation failed:", error.message);
            alert("Location access denied. Using default location.");
            setCoordinates({ lat: 28.625, lon: 77.25 });
          }
        );
      } else {
        alert("Geolocation not supported. Using default location.");
        setCoordinates({ lat: 28.625, lon: 77.25 });
      }
    };
    getInitialLocation();
    const interval = setInterval(() => setTime(moment()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!search) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search.php?q=${search}&format=json&addressdetails=1`
      );
      const data = await res.json();
      const mapped = data.map((item) => ({
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
      setSuggestions(mapped);
    }, 500);
    return () => clearTimeout(timeout);
  }, [search]);
  const handlePrev = () => {
    setStartHourIndex((prev) => Math.max(prev - 12, 0));
  };
  const handleNext = () => {
    if (!weatherData) return;
    const todayHourIndices = weatherData.hourly.time.reduce((acc, t, index) => {
      const m = moment(t);
      const today = moment().startOf("day");
      const tomorrow = moment(today).add(1, "day");
      if (m.isSameOrAfter(today) && m.isBefore(tomorrow)) {
        acc.push(index);
      }
      return acc;
    }, []);
    const maxStartIndex = Math.max(todayHourIndices.length - 6, 0);
    setStartHourIndex((prev) => Math.min(prev + 6, maxStartIndex));
  };
  return (
    <>
      <div className="header">
        <img src={WeatherLogo} height={64} alt="Weather logo" />
        Weather
      </div>
      <div className="screen">
        <input
          type="text"
          placeholder="Search city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.slice(0, 5).map((item, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => {
                  setCoordinates({ lat: item.lat, lon: item.lon });
                  setSearch("");
                  setSuggestions([]);
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <Result
        data={weatherData}
        time={time}
        startHourIndex={startHourIndex}
        handlePrev={handlePrev}
        handleNext={handleNext}
        location={forecastLocation}
      />
    </>
  );
}
function Result({
  data,
  time,
  startHourIndex,
  handlePrev,
  handleNext,
  location,
}) {
  if (!data)
    return (
      <div className="loading">
        <span class="loader"></span>
      </div>
    );
  const { hourly, daily } = data;
  const currentHourIndex = hourly.time.findIndex((t) =>
    moment(t).isSame(moment(), "hour")
  );
  const tempC =
    currentHourIndex !== -1
      ? Math.round(hourly.temperature2m[currentHourIndex])
      : "--";
  const tempF = tempC !== "--" ? Math.round(tempC * 1.8 + 32) : "--";
  const todayHours = hourly.time.reduce((acc, t, index) => {
    const m = moment(t);
    const today = moment().startOf("day");
    const tomorrow = moment(today).add(1, "day");
    if (m.isSameOrAfter(today) && m.isBefore(tomorrow)) {
      acc.push({
        time: t,
        temp: hourly.temperature2m[index],
        wind: hourly.windSpeed10m[index],
        weatherCode: hourly.weatherCode[index],
        precipitation: hourly.precipitationProbability[index],
        humidity: hourly.humidity[index],
        apparentTemperature: hourly.apparentTemperature[index],
      });
    }
    return acc;
  }, []);
  return (
    <div className="result-screen">
      <div className="date-time">
        <div className="dt">
          {moment(time).format("MMMM Do YYYY")} <br />
          Current Time(IST): {moment(time).format("HH:mm:ss")}
        </div>
      </div>
      <div className="temp">
        {tempC} ℃ || {tempF} ℉
      </div>
      <div className="values">
        <div className="loc">Location: {location || "Fetching..."}</div>
        {currentHourIndex !== -1 && (
          <p>
            Visibility : {hourly.visibility[currentHourIndex] / 1000} km <br />
            Feels Like :{" "}
            {Math.floor(hourly.apparentTemperature[currentHourIndex])}℃ <br />
            Humidity : {hourly.humidity[currentHourIndex]}% <br />
            Wind : {Math.floor(hourly.windSpeed10m[currentHourIndex])} km/h{" "}
            <br />
            Chance of Rain : {hourly.precipitationProbability[currentHourIndex]}
            % <br />
            Pressure : {Math.floor(
              hourly.surfacePressure[currentHourIndex]
            )}{" "}
            hPa <br />
            Cloud Cover : {hourly.cloudCover[currentHourIndex]} % <br />
            Sunrise : {moment(daily.sunrise[0]).format("HH:mm a")} <br />
            Sunset : {moment(daily.sunset[0]).format("HH:mm a")}
          </p>
        )}
      </div>
      <div className="hourly-weather">
        <ArrowBackIosNewIcon
          className={`prev-btn ${startHourIndex === 0 ? "disabled" : ""}`}
          onClick={startHourIndex === 0 ? null : handlePrev}
        />
        Hourly Weather
        <ArrowForwardIosIcon
          className={`next-btn ${
            startHourIndex + 6 >= todayHours.length ? "disabled" : ""
          }`}
          onClick={startHourIndex + 6 >= todayHours.length ? null : handleNext}
        />
        <div className="hourly-cards">
          {todayHours
            .slice(startHourIndex, startHourIndex + 6)
            .map((hour, idx) => (
              <EachHour key={idx} {...hour} />
            ))}
        </div>
      </div>
      <div className="daily-weather">
        Next 7 Days...{" "}
        <div className="daily-cards">
          {daily.time.slice(1).map((date, idx) => (
            <EachDay
              key={idx}
              date={moment(date).format("ddd")}
              formattedDate={moment(date).format("MMM DD")}
              min={daily.temperature2mMin.slice(1)[idx]}
              max={daily.temperature2mMax.slice(1)[idx]}
              weatherCode={daily.weatherCode[idx + 1]}
              sunrise={daily.sunrise[idx + 1]}
              sunset={daily.sunset[idx + 1]}
              wind={daily.windSpeed10mMax[idx + 1]}
              precipitation={daily.precipitationSum[idx + 1]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function EachHour({
  time,
  temp,
  wind,
  weatherCode,
  precipitation,
  humidity,
  apparentTemperature,
}) {
  const getIcon = (code) => {
    if ([0].includes(code)) return "☀️";
    if ([1, 2, 3].includes(code)) return "🌤️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([80, 81, 82].includes(code)) return "🌦️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "❓";
  };
  return (
    <div className="each-hour">
      {moment(time).format("HH:mm")} <br />
      <span className="weather-icon">{getIcon(weatherCode)}</span> <br />
      {Math.round(temp)}℃ <br />
      Wind: {Math.round(wind)} km/h <br />
      Chance of Rain: {precipitation}% <br /> Humidity: {humidity}% <br />
      Feels Like: {apparentTemperature}℃
    </div>
  );
}
function EachDay({
  date,
  formattedDate,
  min,
  max,
  weatherCode,
  sunrise,
  sunset,
  wind,
  precipitation,
}) {
  const getIcon = (code) => {
    if ([0].includes(code)) return "☀️";
    if ([1, 2, 3].includes(code)) return "🌤️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([80, 81, 82].includes(code)) return "🌦️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "❓";
  };
  return (
    <div className="each-day">
      {date} - {formattedDate} <br />
      <span className="weather-icon">{getIcon(weatherCode)}</span> <br />
      Min: {Math.floor(min)}℃ - Max: {Math.floor(max)}℃ <br />
      Sunrise: {moment(sunrise).format("HH:mm a")} <br />
      Sunset: {moment(sunset).format("HH:mm a")} <br />
      Wind: {Math.round(wind)} km/h <br />
      Rain: {precipitation}%
    </div>
  );
}
