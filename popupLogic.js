document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("on-off-toggle");
  const timeDisplay = document.getElementById("time-display");
  let stopwatchInterval = null;
  let startTime = null;

  // Function to update the time display
  function updateTimeDisplay() {
    if (isNaN(startTime)) {
      // If startTime is not a number, reset the display
      timeDisplay.textContent = "00:00:00";
      return;
    }

    const currentTime = new Date();
    const elapsedTime = new Date(currentTime - startTime);
    const hours = elapsedTime.getUTCHours().toString().padStart(2, "0");
    const minutes = elapsedTime.getUTCMinutes().toString().padStart(2, "0");
    const seconds = elapsedTime.getUTCSeconds().toString().padStart(2, "0");
    timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  }

  // Function to start the stopwatch
  function startStopwatch(savedStartTime) {
    startTime = new Date(savedStartTime);
    if (!isNaN(startTime)) {
      stopwatchInterval = setInterval(updateTimeDisplay, 1000);
    }
  }

  // Load stored data when popup is opened
  chrome.storage.local.get(
    ["stopwatchStartTime", "isToggleOn"],
    function (result) {
      if (result.isToggleOn && result.stopwatchStartTime) {
        toggle.checked = true;
        console.log("HEY", result.stopwatchStartTime);
        startStopwatch(result.stopwatchStartTime);
      } else {
        // If no valid data in storage, ensure the toggle is off and reset display
        toggle.checked = false;
        timeDisplay.textContent = "00:00:00";
      }
    }
  );

  // Toggle change event listener
  toggle.addEventListener("change", function () {
    if (this.checked) {
      startTime = new Date();
      chrome.storage.local.set({
        stopwatchStartTime: startTime.getTime(),
        isToggleOn: true,
      });
      startStopwatch(startTime);
    } else {
      clearInterval(stopwatchInterval);
      startTime = null;
      chrome.storage.local.set({ stopwatchStartTime: null, isToggleOn: false });
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
