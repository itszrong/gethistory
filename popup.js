// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Event listner for clicks on links in a browser action popup.
// Open the link in a new tab of the current window.

let urlToCount = {};

function onAnchorClick(event) {
  // Record the current time as the link opening time
  let linkOpeningTime = Date.now();

  // Get the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let sourceTabId = tabs[0].id;

    // Store the link opening time using the source tab ID
    chrome.storage.local.set(
      { [`linkOpeningTime_${sourceTabId}`]: linkOpeningTime },
      function () {
        console.log("Link opening time set for tab " + sourceTabId);
      }
    );

    // Create a new tab with the clicked URL
    chrome.tabs.create({
      active: true,
      url: event.srcElement.href,
    });
  });
  return false;
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.

function buildPopupDom(divName, processedUrls) {
  console.log("Processed URLs:", processedUrls);
  let copyButton = document.createElement("button");
  copyButton.textContent = "Copy links and see rabbit hole";

  let popupDiv = document.getElementById(divName);
  let copyButtonDiv = document.getElementById("copy-button-container");

  let ul = document.createElement("ul");
  copyButton.addEventListener("click", () => copyTextToClipboard(popupDiv));
  copyButtonDiv.appendChild(copyButton);
  popupDiv.appendChild(ul);

  processedUrls.forEach((processedItem) => {
    let item = processedItem.data;
    let url = processedItem.url;

    let li = document.createElement("li");
    ul.appendChild(li);

    let a = document.createElement("a");
    a.href = url;
    a.textContent = `url: ${url} (Visits: ${item.count})`;
    a.addEventListener("click", onAnchorClick);
    li.appendChild(a);

    // Display the first visit time
    if (item.visitTimes.length > 0) {
      let firstVisitTime = document.createElement("span");
      firstVisitTime.textContent = ` First visit: ${new Date(
        item.visitTimes[0]
      ).toLocaleString()}`;
      li.appendChild(firstVisitTime);
    }

    // Display the id
    let ids = document.createElement("span");
    ids.textContent = ` ID: ${item.ids}`;
    li.appendChild(ids);

    // Display the visitId
    if (item.visitIds.length > 0) {
      let visitIds = document.createElement("div");
      visitIds.textContent = ` Entering Visit IDs: ${item.visitIds.join(",")}`;
      li.appendChild(visitIds);
    }

    // Display the referringVisitIds
    if (item.referringVisitIds.length > 0) {
      let referringIds = document.createElement("div");
      referringIds.textContent = ` Referring Visit IDs: ${item.referringVisitIds.join(
        ","
      )}`;
      li.appendChild(referringIds);
    }

    if (item.sourceTabId) {
      // Check if sourceTabId exists in the data
      let sourceTabIdTime = document.createElement("div");
      sourceTabIdTime.textContent = `Link opened from tab ID: ${item.sourceTabId}`;
      li.appendChild(sourceTabIdTime);
      console.log("sourcetab exists");
    }

    if (item.newTabId) {
      // Check if newTabId exists in the data
      let newTabCreatedTime = document.createElement("div");
      newTabCreatedTime.textContent = `New tab ID: ${item.newTabId}`;
      li.appendChild(newTabCreatedTime);
      console.log("new tab id exists");
    }

    // Append li to ul
    ul.appendChild(li);
  });

  // Append ul to popupDiv
  popupDiv.appendChild(ul);
}

// Function to copy text content of a div to clipboard
function copyTextToClipboard(div) {
  let textToCopy = "";
  div.querySelectorAll("li").forEach((li) => {
    textToCopy += li.textContent + "\n";
  });

  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      console.log("Text copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}

let startTime = null;
let toggleStatus = false;

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("on-off-toggle");
  const timeDisplay = document.getElementById("time-display");

  // Load stored data when popup is opened
  chrome.storage.local.get(
    ["stopwatchStartTime", "isToggleOn"],
    function (result) {
      startTime = result.stopwatchStartTime;
      toggleStatus = result.isToggleOn;
    }
  );

  // Toggle change event listener
  toggle.addEventListener("change", function () {
    if (this.checked) {
      startTime = new Date();
    } else {
      startTime = null;
    }
  });
});

// Function to get the corrected referringVisitId asynchronously
function getCorrectedReferringVisitId(visitItem) {
  return new Promise((resolve, reject) => {
    if (visitItem.referringVisitId !== "0") {
      resolve(visitItem.referringVisitId); // No correction needed
    } else {
      // Get the creation time of the current tab
      chrome.storage.local.get(
        `newTabCreatedTime_${visitItem.id}`,
        function (newTabResult) {
          if (newTabResult[`newTabCreatedTime_${visitItem.id}`]) {
            // Compare this creation time with the link opening times of all tabs
            chrome.storage.local.get(null, function (allItems) {
              for (let key in allItems) {
                if (key.startsWith("linkOpeningTime_")) {
                  let sourceTabId = key.split("_")[1];
                  let linkOpeningTime = allItems[key];

                  // If the times are close enough, consider this tab a match
                  if (
                    Math.abs(
                      newTabResult[`newTabCreatedTime_${visitItem.id}`] -
                        linkOpeningTime
                    ) <= TIME_THRESHOLD
                  ) {
                    resolve(sourceTabId); // Use the source tab ID as the corrected referring visit ID
                    return;
                  }
                }
              }
              resolve("0"); // No match found, keep original referringVisitId as "0"
            });
          } else {
            resolve("0"); // No newTabCreatedTime found, keep original referringVisitId as "0"
          }
        }
      );
    }
  });
}

// Search history to find up to ten links that a user has typed in,
// and show those links in a popup.

function buildTypedUrlList(divName) {
  let microsecondsPerWeek = 1000 * 60 * 60 * 24 * 365;
  let oneWeekAgo = new Date().getTime() - microsecondsPerWeek;
  let urlProcessPromises = []; // Array to hold promises for each URL's processing

  chrome.storage.local.get(
    ["stopwatchStartTime", "isToggleOn"],
    function (result) {
      let startTime = result.stopwatchStartTime;
      let chromeStart = startTime ? startTime : new Date();

      chrome.history.search(
        {
          text: "", // Return every history item....
          startTime: chromeStart, // since toggle or that was accessed less than one week ago.
        },
        function (historyItems) {
          for (let i = 0; i < historyItems.length; ++i) {
            let url = historyItems[i].url;
            let processVisitsWithUrl = function (url) {
              return function (visitItems) {
                return processVisits(url, visitItems);
              };
            };
            let promise = new Promise((resolve) => {
              chrome.history.getVisits({ url: url }, function (visitItems) {
                processVisitsWithUrl(url)(visitItems).then((processedData) => {
                  resolve({ url: url, data: processedData });
                });
              });
            });
            urlProcessPromises.push(promise);
          }
          Promise.all(urlProcessPromises).then((processedUrls) => {
            buildPopupDom(divName, processedUrls);
          });
        }
      );
    }
  );
}

const processVisits = function (url, visitItems) {
  console.log(`Processing visits for URL: ${url}`); // Debug: Log the URL being processed

  let visitPromises = visitItems.map((visitItem) => {
    return getCorrectedReferringVisitId(visitItem).then(
      (correctedReferringVisitId) => {
        if (!urlToCount[url]) {
          urlToCount[url] = {
            count: 0,
            visitTimes: [],
            referringVisitIds: [],
            visitIds: [],
            ids: [],
          };
          console.log(`Initialized urlToCount for ${url}`); // Debug: Log initialization
        }
        urlToCount[url].count++;
        urlToCount[url].visitTimes.push(visitItem.visitTime);
        urlToCount[url].ids.push(visitItem.id);
        urlToCount[url].visitIds.push(visitItem.visitId);
        urlToCount[url].referringVisitIds.push(correctedReferringVisitId);
        console.log(`Processed visitItem for ${url}`, visitItem); // Debug: Log each processed visitItem
      }
    );
  });

  return Promise.all(visitPromises).then(() => {
    console.log(`All visits processed for URL: ${url}`, urlToCount[url]); // Debug: Log the processed data
    return urlToCount[url]; // Resolve with the processed data for this URL
  });
};

// This function is called when we have the final list of URLs to display.
const onAllVisitsProcessed = () => {
  // Get the top URLs
  let urlArray = [];
  for (let url in urlToCount) {
    urlArray.push({ url: url, data: urlToCount[url] });
  }
};

document.addEventListener("DOMContentLoaded", function () {
  buildTypedUrlList("typedUrl_div");
});
