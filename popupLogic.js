document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("on-off-toggle");
  const timeDisplay = document.getElementById("time-display");
  let stopwatchInterval = null;
  let savedTime;

  // Load the saved state and time
  chrome.storage.sync.get(["toggleState", "startTime"], function (data) {
    if (data.toggleState) {
      toggle.checked = true;
      // Calculate the elapsed time since the toggle was turned on
      savedTime = data.startTime ? new Date(data.startTime) : new Date();
      const elapsedTime = new Date(new Date() - savedTime);
      startTimer(elapsedTime);
    }
  });

  toggle.addEventListener("change", function () {
    if (this.checked) {
      // Save the time the toggle was turned on
      savedTime = new Date();
      chrome.storage.sync.set({ toggleState: true, startTime: savedTime });
      startTimer();
    } else {
      clearInterval(stopwatchInterval);
      chrome.storage.sync.set({ toggleState: false });
      timeDisplay.textContent = "00:00:00";
    }
  });

  function startTimer(elapsedTime) {
    stopwatchInterval = setInterval(() => {
      //startTime = new Date();
      stopwatchInterval = setInterval(() => {
        const currentTime = new Date();
        const elapsedTime = new Date(currentTime - savedTime);
        const hours = elapsedTime.getUTCHours().toString().padStart(2, "0");
        const minutes = elapsedTime.getUTCMinutes().toString().padStart(2, "0");
        const seconds = elapsedTime.getUTCSeconds().toString().padStart(2, "0");
        timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
      }, 1000);
    });
  }
});

document
  .getElementById("content-toggle")
  .addEventListener("change", function () {
    const contentDiv = document.getElementById("content");
    contentDiv.style.display = this.checked ? "block" : "none";
  });
