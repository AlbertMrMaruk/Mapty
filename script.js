"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
// const editForm = document.querySelector('.form');
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputSort = document.querySelector(".form__input--sort");
const inputSortT = document.querySelector(".form__input--sortT");
const btnSort = document.querySelector(".btn-apply");
const moveMap = document.querySelector("#moveMap");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteAll = document.querySelector("#deleteAll");

class Workout {
  date = new Date();
  marker;
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
}
class Cycling extends Workout {
  name = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(2);
    return this.speed;
  }
}
class Running extends Workout {
  name = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(2);
    return this.pace;
  }
}
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #editOn;
  #editWorkoutEl;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    inputType.addEventListener("change", this._toggleElevationField);
    form.addEventListener("submit", this._newWorkout.bind(this));
    containerWorkouts.addEventListener("click", this._moveToMarker.bind(this));
    deleteAll.addEventListener("click", this._deleteAllWorkouts.bind(this));
    btnSort.addEventListener("click", this._sortWorkouts.bind(this));
    moveMap.addEventListener("click", this._moveMap.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert("No way")
      );
  }
  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on("click", this._showForm.bind(this));
    this.#workouts.forEach((el) => {
      this._bindPopup(el);
    });
  }
  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _showEditForm(workout, workoutEl) {
    this._hideForm();
    form.classList.remove("hidden");
    inputDistance.focus();
    inputType.value = workout.name;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.name === "running") inputCadence.value = workout.cadence;
    if (workout.name === "cycling") inputElevation.value = workout.elevation;
    if (
      (inputType.value === "cycling" &&
        inputElevation
          .closest(".form__row")
          .classList.contains("form__row--hidden")) ||
      (inputType.value === "running" &&
        inputCadence
          .closest(".form__row")
          .classList.contains("form__row--hidden"))
    )
      this._toggleElevationField();
    this.#editOn = true;
    this.#editWorkoutEl = workout;
  }
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _newWorkout(e) {
    e.preventDefault();
    // Setting values
    let coords;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    // Checking valid
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert("Inputs should be only positive integers");
      }
      if (this.#editOn) {
        this._editCurrentWorkout(
          type,
          distance,
          duration,
          "elevation",
          elevation
        );
      } else {
        coords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];
        workout = new Cycling(coords, distance, duration, elevation);
        this.#workouts.push(workout);
        this._bindPopup(workout);
        this._renderWorkoutList(workout);
      }
    }
    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert("Inputs should be only positive integers");
      }
      if (this.#editOn) {
        this._editCurrentWorkout(type, distance, duration, "cadence", cadence);
      } else {
        coords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];
        // https://geocode-maps.yandex.ru/1.x?geocode=${coords}&apikey=96cafcfd-8145-4734-83d6-6740e3820a53&sco=latlong&format=json
        workout = new Running(coords, distance, duration, cadence);
        this.#workouts.push(workout);
        this._bindPopup(workout);
        this._renderWorkoutList(workout);
        // this._fetchGeo(`https://geocode.xyz/${coords}?geoit=json`).then(
        //   (data) => {
        //     workout = new Running(
        //       `${data.region}, ${data.country}`,
        //       coords,
        //       distance,
        //       duration,
        //       cadence
        //     );
        //     this.#workouts.push(workout);
        //     this._bindPopup(workout);
        //     this._renderWorkoutList(workout);
        //     console.log(data);
        //   }
        // );
      }
    }
    this._hideForm();
    this._setLocalStorage();
  }
  _editCurrentWorkout(type, distance, duration, charactName, charactInd) {
    let workout = this.#editWorkoutEl;
    [workout.distance, workout.duration, workout[charactName]] = [
      distance,
      duration,
      charactInd,
    ];
    this.#editWorkoutEl.name == "running"
      ? workout.calcPace()
      : workout.calcSpeed();
    workout.name = type;
    document.querySelectorAll(".workout").forEach((el) => el.remove());
    this._setLocalStorage();
    this._getLocalStorage();
  }
  async _fetchGeo(url) {
    try {
      const data = await fetch(url);
      console.log(data);
      if (!data.ok) throw "FUuck Maaan";
      return data.json();
    } catch (err) {
      console.log("Errrrr" + err.message);
    }
  }
  _bindPopup(work) {
    const marker = L.marker(work.coords);
    marker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${work.name}-popup`,
        })
      )
      .setPopupContent(
        `${work.name === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${
          work.name[0].toUpperCase() + work.name.slice(1).toLowerCase()
        } on ${Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "2-digit",
        }).format(new Date(work.date))}`
      )
      .openPopup();
    this.#markers.push(marker);
  }
  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";
    form.classList.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.classList.display = "grid"), 1000);
  }
  _renderWorkoutList(workout) {
    let html = `
       <li class="workout workout--${workout.name}" data-id="${workout.id}">
          <h2 class="workout__title">${
            workout.name[0].toUpperCase() + workout.name.slice(1).toLowerCase()
          } on ${Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
    }).format(new Date(workout.date))}</h2>
          <ul class="workout__icons">
            <li><img class="edit" src="/pencil.png"></li>
            <li><img class="delete" src="/x.png"></li>
          </ul>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.name === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
      <span class="workout__icon">⚡️</span>
    `;
    if (workout.name === "running") {
      html += `
      <span class="workout__value">${workout.pace}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }
    if (workout.name === "cycling") {
      html += `
      <span class="workout__value">${workout.speed}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
      `;
    }
    form.insertAdjacentHTML("afterend", html);
  }
  _moveToMarker(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find((el) => el.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    if (e.target.classList.contains("edit")) this._showEditForm(workout);
    if (e.target.classList.contains("delete"))
      this._deleteWorkout(workout, workoutEl);
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const item = JSON.parse(localStorage.getItem("workouts"));
    if (!item) return;
    let elNew;
    this.#workouts = item;
    this.#workouts = this.#workouts.map((el) => {
      if (el.name === "running") {
        elNew = new Running(el.coords, el.distance, el.duration, el.cadence);
      } else {
        elNew = new Cycling(el.coords, el.distance, el.duration, el.elevation);
      }
      [elNew.date, elNew.id] = [el.date, el.id];
      this._renderWorkoutList(elNew);
      return elNew;
    });
  }
  _deleteWorkout(workout, workoutEl) {
    let indWrk = this.#workouts.indexOf(workout);
    this.#workouts.splice(indWrk, 1);
    this.#markers[indWrk].remove();
    this.#markers.splice(indWrk, 1);
    workoutEl.remove();
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _deleteAllWorkouts(e) {
    e.preventDefault();
    localStorage.removeItem("workouts");
    location.reload();
  }
  _sortWorkouts() {
    if (inputSortT.value == "decend") {
      this.#workouts.sort((a, b) => {
        if (!a[inputSort.value]) return -1;
        if (!b[inputSort.value]) return 1;
        return a[inputSort.value] - b[inputSort.value];
      });
    } else {
      this.#workouts.sort((a, b) => {
        if (!a[inputSort.value]) return -1;
        if (!b[inputSort.value]) return 1;
        return b[inputSort.value] - a[inputSort.value];
      });
    }
    document.querySelectorAll(".workout").forEach((el) => el.remove());
    this.#workouts.forEach((el) => this._renderWorkoutList(el));
  }
  _moveMap(e) {
    e.preventDefault();
    this.#map.fitBounds([this.#workouts.map((el) => el.coords)]);
  }
}
const app = new App();
