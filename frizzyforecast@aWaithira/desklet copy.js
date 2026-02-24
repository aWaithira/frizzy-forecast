const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;

function FrizzyForecastDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

FrizzyForecastDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.lat = "57.7089";
        this.lon = "11.9746";

        // Main container
        this._box = new St.BoxLayout({ vertical: true });
        this._box.add_style_class_name("frizzy-container");
        // Title
        this._title = new St.Label({ text: "Frizzy Forecast" });
        this._title.add_style_class_name("frizzy-title");

        // City
        this._city = new St.Label({ text: "Gothenburg" });
        this._city.add_style_class_name("frizzy-city");

        // Weather icon
        this._icon = new St.Label({ text: "☁️" });
        this._icon.add_style_class_name("frizzy-icon");

        // Temperature
        this._temp = new St.Label({ text: "--°C" });
        this._temp.add_style_class_name("frizzy-temp");

        // Advice
        this._advice = new St.Label({ text: "Loading forecast..." });
        this._advice.add_style_class_name("frizzy-advice");


        this._box.add_child(this._title);
        this._box.add_child(this._city);
        this._box.add_child(this._icon);
        this._box.add_child(this._temp);
        this._box.add_child(this._advice);

        this.setContent(this._box);

        this._updateWeather();

        this._timeout = Mainloop.timeout_add_seconds(600, () => {
            this._updateWeather();
            return true;
        });
    },

    _updateWeather: function() {

        let url = `https://api.open-meteo.com/v1/forecast?latitude=${this.lat}&longitude=${this.lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,weathercode,windspeed_10m&timezone=auto`;

        let session = new Soup.Session();
        let message = Soup.Message.new("GET", url);

        session.send_and_read_async(message, Soup.MessagePriority.NORMAL, null,
            (session, result) => {
                try {
                    let bytes = session.send_and_read_finish(result);
                    let data = JSON.parse(bytes.get_data());

                    let now = new Date();
                    let currentHourISO = now.toISOString().slice(0, 13);

                    let times = data.hourly.time;
                    let index = times.findIndex(t => t.startsWith(currentHourISO));

                    if (index === -1) {
                        this._advice.set_text("Time error 🌫");
                        return;
                    }

                    let temp = Math.round(data.hourly.temperature_2m[index]);
                    let humidity = data.hourly.relativehumidity_2m[index];
                    let rain = data.hourly.precipitation[index];
                    let wind = data.hourly.windspeed_10m[index];
                    let weathercode = data.hourly.weathercode[index];

                    this._temp.set_text(`${temp}°C`);

                    this._icon.set_text(this._getWeatherIcon(weathercode, rain, wind));

                    let advice = this._getHairAdvice(temp, humidity, rain, wind);
                    this._advice.set_text(advice);

                } catch (e) {
                    this._advice.set_text("Weather error ☁️");
                }
            }
        );
    },

    _getWeatherIcon: function(weathercode, rain, wind) {
        // Rain should take precedence
        if (rain > 0)
            return "🌧";

        // Very windy conditions should be clearly visible
        if (wind > 25)
            return "💨";

        // Determine if it's night locally and pick appropriate icons
        let hour = new Date().getHours();
        let isNight = (hour >= 18 || hour < 6);

        if (isNight) {
            // Nighttime icons: prefer moon for clear/partly clear
            if (weathercode === 0)
                return "🌙";

            if (weathercode >= 1 && weathercode <= 3)
                return "🌙"; // partly cloudy night - use moon

            return "☁️";
        } else {
            // Daytime icons
            if (weathercode === 0)
                return "☀️";

            if (weathercode >= 1 && weathercode <= 3)
                return "⛅";

            return "☁️";
        }
    },

    _getHairAdvice: function(temp, humidity, rain, wind) {

        let adviceList = [];

        // Rain
        if (rain > 0) {
            adviceList.push(
                "🌧 Rainy vibes!\nGo curly or protective.\nAvoid straight styles."
            );
        }

        // Humidity
        if (humidity > 75) {
            adviceList.push(
                "💧 High humidity!\nFrizz risk HIGH.\nBuns, braids or textured styles."
            );
        } else if (humidity > 60) {
            adviceList.push(
                "💦 Moderate humidity.\nUse anti-frizz serum."
            );
        }

        // Wind
        if (wind > 25) {
            adviceList.push(
                "💨 Windy!\nSecure your style strongly."
            );
        }

        // Cold
        if (temp < 5) {
            adviceList.push(
                "🧊 Cold air!\nProtect ends.\nHair up recommended."
            );
        }

        // If nothing triggered
        if (adviceList.length === 0) {
            adviceList.push(
                "✨ Balanced day!\nMost styles should hold beautifully."
            );
        }

        return adviceList.join("\n\n");
    },
};

function main(metadata, desklet_id) {
    return new FrizzyForecastDesklet(metadata, desklet_id);
}