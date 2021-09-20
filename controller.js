//Bindings

function ToggleWindow(selector, duration = 200, ease = "linear") {
    if (IdIsValid(selector)) {
        if ($(`#${selector}`).css("display") === "none") OpenWindow(selector);
        else CloseWindow(selector);
    } else console.log(`Could not find ${selector}`);
}

function OpenWindow(selector, duration = 200, ease = "linear") {
    if (IdIsValid(selector)) {
        $(`#${selector}`).fadeIn(200);
        if (gtagExists())
            gtag("event", "open", {
                event_category: "window",
                event_label: selector,
            });
    } else console.log(`Could not find ${selector}`);
}

function CloseWindow(selector, duration = 200, ease = "linear") {
    if (IdIsValid(selector)) {
        $(`#${selector}`).fadeOut(200, ease);
        if (gtagExists())
            gtag("event", "close", {
                event_category: "window",
                event_label: selector,
            });
    } else console.log(`Could not find ${selector}`);
}

function IdIsValid(selector) {
    return $(`#${selector}`).length > 0;
}

function gtagExists() {
    return typeof gtag === "function";
}

function HotspotAnalytics(scene) {
    if (gtagExists()) {
        gtag("event", "moveTo", {
            event_category: "hotspot",
            event_label: scene,
        });
    }
}

function ShowProgressBar() {
    progressBar = document.getElementById("progress-bar");
    progressBar.style.visibility = "visible";
}

function HideProgressBar() {
    progressBar = document.getElementById("progress-bar");
    progressBar.style.visibility = "hidden";
}

function UpdateProgressBar(value) {
    progressBar = document.getElementById("progress-bar");
    progressBar.value = Math.round(value * 100);
}

//image zooming
let scale = 1,
    panning = false,
    pointX = 0,
    pointY = 0,
    start = { x: 0, y: 0 },
    imgOverlay,
    zoomedImgWrapper,
    customImg;

$(document).ready(function() {
    console.log("Loaded");
    imgOverlay = document.getElementById("img-overlay");
    zoomedImgWrapper = document.getElementById("zoomed-img-wrapper");
    customImg = document.getElementById("custom-img");

    $("#img-overlay").click(function(e) {
        if (e.target.id == "img-overlay") {
            CloseWindow("img-overlay");
        }
    });

    $("#img-overlay")
        .find("#close")
        .click(function() {
            CloseWindow("img-overlay");
        });

    $(".bg-veil").click(function(e) {
        CloseWindow(e.target.parentElement.id);
    });

    $(".custom-img").click(function(e) {
        OpenWindow("img-overlay");
        $("#custom-zoomed-img").attr("src", e.target.src);
    });

    zoomedImgWrapper.onmousedown = function(e) {
        e.preventDefault();
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
        panning = true;
    };

    zoomedImgWrapper.onmouseup = function(e) {
        e.preventDefault();
        panning = false;
    };

    zoomedImgWrapper.onmousemove = function(e) {
        e.preventDefault();
        if (!panning) {
            return;
        }
        pointX = e.clientX - start.x;
        pointY = e.clientY - start.y;
        setTransform();
    };

    zoomedImgWrapper.onwheel = function(e) {
        e.preventDefault();
        var delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
        delta > 0 ? (scale *= 1.2) : (scale /= 1.2);
        setTransform();
    };
});

function resetZoomVariables() {
    scale = 1;
    panning = false;
    pointX = 0;
    pointY = 0;
    start = { x: 0, y: 0 };
}

function zoomInImage() {
    imgOverlay.style.display = "flex";
    let imageSrc = customImg.src;
    document.getElementById("custom-zoomed-img").src = imageSrc;
}

function zoomOutImage() {
    CloseWindow("img-overlay");
    zoomedImgWrapper.style.transform = "scale(1) translate(0px, 0px)";

    resetZoomVariables();
}

function setTransform() {
    zoomedImgWrapper.style.transform =
        "translate(" + pointX + "px, " + pointY + "px) scale(" + scale + ")";
}