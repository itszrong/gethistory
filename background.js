chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log("onCreatedNavigationTarget event occurred", details); // Debug lo
  let newTabId = details.tabId;
  let sourceTabId = details.sourceTabId;

  // Record the creation time of the new tab
  let newTabCreatedTime = Date.now();
  chrome.storage.local.set(
    { [`newTabCreatedTime_${newTabId}`]: newTabCreatedTime },
    function () {
      console.log("New tab creation time set for tab " + newTabId);
    }
  );

  if (sourceTabId) {
    // Retrieve the link opening time for the source tab
    chrome.storage.local.get(
      `linkOpeningTime_${sourceTabId}`,
      function (result) {
        let linkOpeningTime = result[`linkOpeningTime_${sourceTabId}`];
        if (linkOpeningTime) {
          // Compare linkOpeningTime and newTabCreatedTime
          const TIME_THRESHOLD = 10000; // 5 seconds, adjust as necessary
          if (Math.abs(newTabCreatedTime - linkOpeningTime) <= TIME_THRESHOLD) {
            console.log(
              `New tab ${newTabId} was likely opened from a link in tab ${sourceTabId}`
            );

            // Here you can associate the new tab with the source tab's visitId or other info
            // For example, let's store this relationship in chrome.storage.local
            let associationKey = `tabAssociation_${newTabId}`;
            let associationData = {
              sourceTabId: sourceTabId,
              sourceTabLinkOpeningTime: linkOpeningTime,
              newTabCreatedTime: newTabCreatedTime,
            };
            chrome.storage.local.set(
              { [associationKey]: associationData },
              function () {
                console.log(
                  `Association between new tab ${newTabId} and source tab ${sourceTabId} stored.`
                );
              }
            );
          }
        }
      }
    );
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action == "getAssociationData") {
    // Fetch the association data from storage
    chrome.storage.local.get(null, function (items) {
      // Get all items from storage
      // Filter out only association data
      const associationData = {};
      Object.keys(items).forEach((key) => {
        if (key.startsWith("tabAssociation_")) {
          associationData[key] = items[key];
        }
      });
      // Send the association data to the popup
      sendResponse({ data: associationData });
    });
    return true; // Indicates that you wish to send a response asynchronously
  }
});

chrome.runtime.sendMessage(
  { action: "getAssociationData" },
  function (response) {
    if (chrome.runtime.lastError || !response) {
      // Handle error or invalid response
      console.error(
        "Error fetching association data:",
        chrome.runtime.lastError?.message
      );
      return;
    }
    console.log("Association Data:", response.data);
    // ...
  }
);
