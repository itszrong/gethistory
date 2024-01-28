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
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href,
  });
  return false;
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.
function buildPopupDom(divName, data) {
  let copyButton = document.createElement("button");
  copyButton.textContent = "Copy links and see rabbit hole";

  let popupDiv = document.getElementById(divName);
  let copyButtonDiv = document.getElementById("copy-button-container");

  let ul = document.createElement("ul");
  copyButton.addEventListener("click", () => copyTextToClipboard(popupDiv));
  //popupDiv.appendChild(copyButton);
  copyButtonDiv.appendChild(copyButton);
  popupDiv.appendChild(ul);

  data.forEach((item) => {
    let a = document.createElement("a");
    a.href = item.url;
    a.textContent = `url: ${item.url} (Visits: ${item.data.count})`;
    a.addEventListener("click", onAnchorClick);

    let li = document.createElement("li");
    li.appendChild(a);

    // Display the first visit time
    if (item.data.visitTimes.length > 0) {
      let firstVisitTime = document.createElement("span");
      firstVisitTime.textContent = ` First visit: ${new Date(
        item.data.visitTimes[0]
      ).toLocaleString()}`;
      li.appendChild(firstVisitTime);
    }

    // Display the id
    let ids = document.createElement("span");
    ids.textContent = ` ID: ${item.data.ids}`;
    li.appendChild(ids);

    // Display the visitId
    if (item.data.visitIds.length > 0) {
      let visitIds = document.createElement("div");
      visitIds.textContent = ` Entering Visit IDs: ${item.data.visitIds.join(
        ","
      )}`;
      li.appendChild(visitIds);
    }

    // Display the referringVisitIds
    if (item.data.referringVisitIds.length > 0) {
      let referringIds = document.createElement("div");
      referringIds.textContent = ` Referring Visit IDs: ${item.data.referringVisitIds.join(
        ","
      )}`;
      li.appendChild(referringIds);
    }

    ul.appendChild(li);
  });
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

// Search history to find up to ten links that a user has typed in,
// and show those links in a popup.
function buildTypedUrlList(divName) {
  // To look for history items visited in the last week,
  // subtract a week of microseconds from the current time.
  // let microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  // let oneWeekAgo = new Date().getTime() - microsecondsPerWeek;

  let microsecondsPerWeek = 1000 * 60 * 60 * 24 * 365;
  let oneWeekAgo = new Date().getTime() - microsecondsPerWeek;

  // Track the number of callbacks from chrome.history.getVisits()
  // that we expect to get.  When it reaches zero, we have all results.
  let numRequestsOutstanding = 0;

  chrome.history.search(
    {
      text: "", // Return every history item....
      startTime: oneWeekAgo, // that was accessed less than one week ago.
    },
    function (historyItems) {
      // For each history item, get details on all visits.
      for (let i = 0; i < historyItems.length; ++i) {
        let url = historyItems[i].url;
        let visitTime = historyItems[i].lastVisitTime;
        let processVisitsWithUrl = function (url) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function (visitItems) {
            processVisits(url, visitItems);
          };
        };
        chrome.history.getVisits({ url: url }, processVisitsWithUrl(url));
        numRequestsOutstanding++;
      }
      if (!numRequestsOutstanding) {
        onAllVisitsProcessed();
      }
    }
  );

  // Maps URLs to a count of the number of times the user typed that URL into
  // the omnibox.
  let urlToCount = {};

  // Callback for chrome.history.getVisits().  Counts the number of times a user visited a URL.
  const processVisits = function (url, visitItems) {
    for (let i = 0, ie = visitItems.length; i < ie; ++i) {
      if (!urlToCount[url]) {
        urlToCount[url] = {
          count: 0,
          visitTimes: [],
          referringVisitIds: [],
          visitIds: [],
          ids: [],
        };
      }

      urlToCount[url].count++;
      urlToCount[url].visitTimes.push(visitItems[i].visitTime);
      urlToCount[url].ids.push(visitItems[i].id);
      urlToCount[url].visitIds.push(visitItems[i].visitId);
      urlToCount[url].referringVisitIds.push(visitItems[i].referringVisitId);
    }

    // Final call processing
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };

  // This function is called when we have the final list of URLs to display.
  const onAllVisitsProcessed = () => {
    // Get the top URLs
    let urlArray = [];
    for (let url in urlToCount) {
      urlArray.push({ url: url, data: urlToCount[url] });
    }

    // Sort, if needed, based on the count or other criteria
    // Example: urlArray.sort((a, b) => b.data.count - a.data.count);

    buildPopupDom("typedUrl_div", urlArray.slice(0, 10000));
  };
}

document.addEventListener("DOMContentLoaded", function () {
  buildTypedUrlList("typedUrl_div");
});
