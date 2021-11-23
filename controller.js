function ToggleWindow(selector) {
    if (IdIsValid(selector)) {
        if ($(`#${selector}`).css("display") === "none") OpenWindow(selector);
        else CloseWindow(selector);
    } else console.log(`Could not find ${selector}`);
}

function OpenWindow(selector) {
    if (IdIsValid(selector)) {
        $(`#${selector}`).fadeIn(200);
        if (gtagExists())
            gtag("event", "open", {
                event_category: "window",
                event_label: selector,
            });
    } else console.log(`Could not find ${selector}`);
}

function CloseWindow(selector) {
    if (IdIsValid(selector)) {
        $(`#${selector}`).fadeOut(200);
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
let scale = 0.8,
    panning = false,
    pointX = 0,
    pointY = 0,
    start = {
        x: 0,
        y: 0
    },
    imgOverlay,
    zoomedImgWrapper,
    customImg;

$(document).ready(function() {
    $(".shareButton").click(function(e) {
        var viewParams = getKrpanoViewParameters();
        var url = viewParams ?
            `${window.location.origin}?${jQuery.param(viewParams)}` :
            window.location.origin;
        if (navigator.share) {
            navigator.share({
                title: `
                            Experience the ${document.title}
                            with me.
                            `,
                text: `
                            I thought you might find this interesting: ${url}
                            `,
                url: url,
            });
        } else {
            console.warn("Could not find navigator, copying to clipboard.");
            if (!navigator.clipboard) {
                window.prompt("Copy to clipboard: Ctrl+C, Enter", url);
            } else {
                navigator.clipboard.writeText(window.location.origin);
            }
        }
    });

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
        start = {
            x: e.clientX - pointX,
            y: e.clientY - pointY
        };
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

        let insideViewXAxis = isInViewportX(zoomedImgWrapper)
        let insideViewYAxis = isInViewportY(zoomedImgWrapper)
        let insideTop = insideTopBound(zoomedImgWrapper)
        let insideBottom = insideBottomBound(zoomedImgWrapper)
        let insideLeft = insideLeftBound(zoomedImgWrapper)
        let insideRight = insideRightBound(zoomedImgWrapper)

        let updatedPointX = e.clientX - start.x;
        let updatedPointY = e.clientY - start.y;

        if (!insideViewXAxis && !insideViewYAxis) {
            setPointsOutsideBothViewPort(insideTop, insideBottom, insideLeft, insideRight, updatedPointX, updatedPointY)
        } else if (!insideViewXAxis) {
            setPointsOutsideXViewPort(insideTop, insideBottom, updatedPointY)
        } else if (!insideViewYAxis) {
            setPointsOutsideYViewPort(insideLeft, insideRight, updatedPointX)
        }

        setTransform();

    };

    zoomedImgWrapper.onwheel = function(e) {
        e.preventDefault();
        var delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
        delta > 0 ? (scale *= 1.2) : (scale /= 1.2);
        if (scale > 3) {
            scale = 3;
        } else if (scale < 0.8) {
            scale = 0.8;
        }

        pointX = 0;
        pointY = 0;

        setTransform();
    };
});

function setPointsOutsideBothViewPort(insideTop, insideBottom, insideLeft, insideRight, updatedPointX, updatedPointY) {
    if (insideTop) {
        if (pointY > updatedPointY) {
            pointY = updatedPointY;
        }
    } else if (insideBottom) {
        if (pointY < updatedPointY) {
            pointY = updatedPointY;
        }

    } else if (insideLeft) {
        if (pointX > updatedPointX) {
            pointX = updatedPointX;
        }
    } else if (insideRight) {
        if (pointX < updatedPointX) {
            pointX = updatedPointX;
        }

    } else {
        pointX = updatedPointX;
        pointY = updatedPointY;
    }
}

function setPointsOutsideXViewPort(insideTop, insideBottom, updatedPointY) {
    if (insideTop) {
        if (pointY > updatedPointY) {
            pointY = updatedPointY;
        }
    } else if (insideBottom) {
        if (pointY < updatedPointY) {
            pointY = updatedPointY;
        }
    } else {
        pointY = updatedPointY;
    }
}

function setPointsOutsideYViewPort(insideLeft, insideRight, updatedPointX) {
    if (insideLeft) {
        if (pointX > updatedPointX) {
            pointX = updatedPointX;
        }
    } else if (insideRight) {
        if (pointX < updatedPointX) {
            pointX = updatedPointX;
        }

    } else {
        pointX = updatedPointX;
    }
}


function isInViewportY(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.left >= 0 &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}


function isInViewportX(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
}


function insideLeftBound(element) {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0
}


function insideRightBound(element) {
    const rect = element.getBoundingClientRect();
    return rect.right <= (window.innerWidth || document.documentElement.clientWidth)
}

function insideTopBound(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0
}



function insideBottomBound(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
}

function resetZoomVariables() {
    scale = 0.8;
    panning = false;
    pointX = 0;
    pointY = 0;
    start = {
        x: 0,
        y: 0
    };
}

function zoomInImage() {
    imgOverlay.style.display = "flex";
    let imageSrc = customImg.src;
    document.getElementById("custom-zoomed-img").src = imageSrc;
}

function zoomOutImage() {
    CloseWindow("img-overlay");
    zoomedImgWrapper.style.transform = "scale(0.8) translate(0px, 0px)";

    resetZoomVariables();
}

function setTransform() {
    zoomedImgWrapper.style.transform =
        "translate(" + pointX + "px, " + pointY + "px) scale(" + scale + ")";
}

function getKrpanoViewParameters() {
    krpano = document.getElementById("krpanoSWFObject");
    if (krpano) {
        return {
            startscene: krpano.get("xml.scene"),
            hlookat: String(krpano.get("view.hlookat")).slice(0, 5),
            vlookat: String(krpano.get("view.vlookat")).slice(0, 5),
        };
    }
    console.log("failed to get parameters.");
    return null;
}