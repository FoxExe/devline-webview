setInterval(function () {
	var images = document.images;
	for (var i = 0; i < images.length; i++) {
		images[i].src = images[i].src.replace(/\btime=[^&]*/, 'time=' + new Date().getTime());
	}
}, 1000);

ToggleFullscreen = function (node) {
	var block = node.parentElement;
	var image = node.getElementsByTagName('img')[0];

	if (block.classList.contains('block-fullscreen')) {
		block.classList.remove('block-fullscreen');
		image.src = image.src.replace('&original=true','');
	} else {
		block.classList.add('block-fullscreen');
		image.src += `&original=true`;
	}
};