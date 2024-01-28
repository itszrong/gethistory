document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("on-off-toggle");
  const timeDisplay = document.getElementById("time-display");
  let stopwatchInterval = null;
  let startTime = null;

  toggle.addEventListener("change", function () {
    if (this.checked) {
      startTime = new Date();
      stopwatchInterval = setInterval(() => {
        const currentTime = new Date();
        const elapsedTime = new Date(currentTime - startTime);
        const hours = elapsedTime.getUTCHours().toString().padStart(2, "0");
        const minutes = elapsedTime.getUTCMinutes().toString().padStart(2, "0");
        const seconds = elapsedTime.getUTCSeconds().toString().padStart(2, "0");
        timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
      }, 1000);
    } else {
      clearInterval(stopwatchInterval);
      startTime = null;
      timeDisplay.textContent = "00:00:00";
    }
  });
});

document
  .getElementById("content-toggle")
  .addEventListener("change", function () {
    const contentDiv = document.getElementById("content");
    contentDiv.style.display = this.checked ? "block" : "none";
  });
