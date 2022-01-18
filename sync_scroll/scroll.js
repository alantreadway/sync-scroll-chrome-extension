sync_scroll = {
	port: chrome.extension.connect({name: "sync_scroll"}),
	focused: false,
	debug: true,
}

window.addEventListener('scroll', function (e) {
	if(!sync_scroll.focused) { return; }

	var x = window.scrollX;
	var y = window.scrollY;
	if (!isFinite(x) || !isFinite(y)) { return; }

	log(`tab sends scrollXY: ${x},${y}`);
	sync_scroll.port.postMessage({
		window_scrollX: x,
		window_scrollY: y
	});
});

window.addEventListener('focus', function () {
	sync_scroll.focused = true;
	log(`sync_scroll.focused = ${sync_scroll.focused}`);
});

window.addEventListener('blur', function () {
	sync_scroll.focused = false;
	log(`sync_scroll.focused = ${sync_scroll.focused}`);
});

sync_scroll.port.onMessage.addListener(function (msg) {
	log({msg, sync_scroll});
	if (sync_scroll.focused) { return; }

	if (msg.window_scrollY) {
		var x = msg.window_scrollX;
		var y = msg.window_scrollY;
		log(`tab receives scrollXY: ${x},${y}`);
		window.scroll(x, y);
	}

	if (msg.url) {
		log(`tab receives url: ${msg.url}`);
		var url = new URL(msg.url);
		var location = window.location;
		if (location.pathname !== url.pathname) {
			window.location.pathname = url.pathname;
			window.location.hash = undefined;
		}
		if (location.hash !== url.hash) {
			window.location.hash = url.hash;
		}
	}
});

function log(msg) {
	if (sync_scroll.debug) {
		console.log(`[sync_scroll]: ${msg}`);
	}
}
