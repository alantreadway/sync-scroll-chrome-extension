sync_scroll = {
    on: false,
	debug: true,
    setOn: function (on) {
        sync_scroll.on = on;
        if(sync_scroll.isOn()) {
            chrome.browserAction.setBadgeText({
                text: 'on'
            });
        } else {
            chrome.browserAction.setBadgeText({
                text: 'off'
            });
        }
    },
    isOn: function () {
        return sync_scroll.on;
    },
    toggle: function () {
        sync_scroll.setOn(!sync_scroll.isOn());
    }
}

chrome.browserAction.onClicked.addListener(function (){
    sync_scroll.toggle();
});

var selectedTabs = {};

chrome.tabs.onHighlighted.addListener(function (highlightedInfo) {
	selectedTabs[highlightedInfo.windowId] = highlightedInfo.tabIds;
	log(`highlighted on windowId: ${highlightedInfo.windowId} tabIds: ${highlightedInfo.tabIds.join(',')}`);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (!tab.highlighted) { return; }
	selectedTabs[tab.windowId] = tab.id;

	if (!sync_scroll.isOn()) { return; }

	var port = ports[tabId];
	if (port == null) { return; }

	sendToSelectedTabs(port, { url: changeInfo.url });
});

var ports = {};

chrome.extension.onConnect.addListener(function (port) {
	console.assert(port.name === 'sync_scroll');
	var tab_id = port.sender.tab.id;
	ports[tab_id] = port;
	log(`port is connected from tabId: ${tab_id}`);
	port.onMessage.addListener(function emit(msg) {
		if (!sync_scroll.isOn()) { return; }
		if (msg.window_scrollY) {
			var x = msg.window_scrollX;
			var y = msg.window_scrollY;
			log(`background receives scrollXY: ${x}, ${y}`);
			sendToSelectedTabs(port, msg);
		}
		if (msg.url) {
			log(`background receives url: ${url}`);
			sendToSelectedTabs(port, msg);
		}
	});
});

function selectedTabIds() {
	var tabIds = [],
		window_id;
	for (window_id in selectedTabs) {
		if (selectedTabs.hasOwnProperty(window_id)) {
			tabIds.push(selectedTabs[window_id]);
		}
	}
	return tabIds;
}

function sendToSelectedTabs(port, msg) {
	var tabIds = selectedTabIds();
	for (var tab_id of tabIds) {
		if (ports[tab_id] && ports[tab_id] !== port) {
			ports[tab_id].postMessage(msg);
			log(`background sends ${msg.window_scrollX},${msg.window_scrollY} to tabId: ${tab_id}`);
		}
	}
}

sync_scroll.setOn(true);

function log(msg) {
	if (sync_scroll.debug) {
		console.log(`[sync_scroll]: ${msg}`);
	}
}
