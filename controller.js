function OpenWindow(selector, duration = 200, ease = "linear") {
    if (IdIsValid(selector)) {
        $(`#${selector}`).fadeIn(duration, ease);
        SendGAEvent("open", "window", selector);
    } else console.warn(`Could not find ${selector}`);
}

function ToggleWindow(selector, duration = 200, ease = "linear") {
    if (IdIsValid(selector)) {
        if ($(`#${selector}`).css("display") === "none")
            OpenWindow(selector, duration, ease);
        else CloseWindow(selector, duration, ease);
    } else console.warn(`Could not find ${selector}`);
}

function CloseWindow(selector, duration = 200, ease = "linear") {
    if (IdIsValid(selector)) {
        $(`#${selector}`).fadeOut(duration, ease);
        SendGAEvent("close", "window", selector);
    } else console.warn(`Could not find ${selector}`);
}

function IdIsValid(selector) {
    return $(`#${selector}`).length > 0;
}

function SendGAEvent(name, event_category, event_label) {
    if (typeof gtag === "function")
        gtag("event", name, {
            event_category: event_category,
            event_label: event_label,
        });
    else console.warn("gtag does not exist.");
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

let TouchState = {
    NONE: 0,
    PANNING: 1,
    PINCHING: 2,
};
Object.freeze(TouchState);

let currentState = TouchState.NONE;

let scale = 0.8,
    panning = false,
    pinching = false,
    pinchingSensitivity = 1.03,
    pinchingThreshold = 4,
    previousPinch = 0,
    pointX = 0,
    pointY = 0,
    start = {
        x: 0,
        y: 0,
    },
    imgOverlay,
    zoomedImgWrapper,
    customImg;

$(document).ready(function() {
    imgOverlay = document.getElementById("img-overlay");
    zoomedImgWrapper = document.getElementById("zoomed-img-wrapper");
    customImg = document.getElementById("custom-img");

    zoomedImgWrapper.onmousedown = function(e) { OnMouseDown(e) };
    zoomedImgWrapper.onmousemove = function(e) { OnMouseMove(e) };
    zoomedImgWrapper.onmouseup = function(e) { OnMouseUp(e) };
    zoomedImgWrapper.onwheel = function(e) { OnWheel(e) };

    zoomedImgWrapper.ontouchstart = function(e) { OnTouchStart(e) };
    zoomedImgWrapper.ontouchmove = function(e) { OnTouchMove(e) };
    zoomedImgWrapper.ontouchend = function(e) { OnTouchEnd(e) };

    //Start functions
    function OnTouchStart(e) {
        if (e.touches.length >= 2) {
            currentState = TouchState.PINCHING;
        } else if (e.touches.length == 1) {
            currentState = TouchState.PANNING;
            var touch = e.touches[0] || e.changedTouches[0];
            e.preventDefault();
            startTouch(touch.clientX, touch.clientY);
        }
        console.log(currentState);
    }

    function OnMouseDown(e) {
        e.preventDefault();
        startTouch(e.clientX, e.clientY);
        panning = true;
    }

    function startTouch(positionX, positionY) {
        start = {
            x: positionX - pointX,
            y: positionY - pointY
        };
    }

    //Move functions
    function OnTouchMove(e) {
        if (currentState == TouchState.PANNING) {
            var touch = e.touches[0] || e.changedTouches[0];
            OnSingleMove(touch.clientX, touch.clientY);
        } else if (currentState == TouchState.PINCHING) {
            OnPinch(e);
        }
    }

    function OnMouseMove(e) {
        if (!panning) { return; }
        e.preventDefault();
        OnSingleMove(e.clientX, e.clientY);
    }

    function OnSingleMove(positionX, positionY) {
        let insideViewXAxis = isInViewportX(zoomedImgWrapper);
        let insideViewYAxis = isInViewportY(zoomedImgWrapper);
        let insideTop = insideTopBound(zoomedImgWrapper);
        let insideBottom = insideBottomBound(zoomedImgWrapper);
        let insideLeft = insideLeftBound(zoomedImgWrapper);
        let insideRight = insideRightBound(zoomedImgWrapper);

        let updatedPointX = positionX - start.x;
        let updatedPointY = positionY - start.y;

        if (!insideViewXAxis && !insideViewYAxis) {
            setPointsOutsideBothViewPort(
                insideTop,
                insideBottom,
                insideLeft,
                insideRight,
                updatedPointX,
                updatedPointY
            );
        } else if (!insideViewXAxis) {
            setPointsOutsideXViewPort(insideTop, insideBottom, updatedPointY);
        } else if (!insideViewYAxis) {
            setPointsOutsideYViewPort(insideLeft, insideRight, updatedPointX);
        }

        setTransform();
    }
    //Scale functions
    function OnWheel(e) {
        e.preventDefault();
        Scale(e.wheelDelta ? e.wheelDelta : -e.deltaY)
    }

    function OnPinch(e) {
        var currentPinch = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY);

        if (previousPinch == 0) {
            previousPinch = currentPinch;
        } else {
            if (Math.abs(currentPinch - previousPinch) > pinchingThreshold) {
                e.preventDefault();
                if (currentPinch < previousPinch) Scale(-1, pinchingSensitivity);
                else Scale(1, pinchingSensitivity);
                previousPinch = currentPinch;
            }
        }
    }

    function Scale(delta, sensitivity = 1.1) {
        delta > 0 ? (scale *= sensitivity) : (scale /= sensitivity);
        if (scale > 3) {
            scale = 3;
        } else if (scale < 0.8) {
            scale = 0.8;
        }

        setTransform();
    }
    //End functions

    function OnMouseUp(e) {
        console.log("OnMouseUp");
        e.preventDefault();
        panning = false;
    }

    function OnTouchEnd(e) {
        if (e.touches.length >= 2) {
            currentState = TouchState.PINCHING;
        } else if (e.touches.length === 1) {
            previousPinch = 0;
            currentState = TouchState.PANNING;
        } else {
            currentState = TouchState.NONE;
        }
    }
    $(".shareButton").click(function(e) {
        var viewParams = getKrpanoViewParameters();
        var url = viewParams ?
            `${window.location.href}?${jQuery.param(viewParams)}` :
            window.location.href;
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
                navigator.clipboard.writeText(window.location.href);
            }
        }
    });

    $("[data-window-show]").click(function(index) {
        let eventElId = JSON.parse($(this).attr("data-window-show"))[0].id;
        OpenWindow(eventElId);
    });

    $("[data-window-hide]").click(function(index) {
        let eventElId = JSON.parse($(this).attr("data-window-hide"))[0].id;
        console.log(eventElId);
        CloseWindow(eventElId);
    });

    $("[data-window-toggle]").click(function(index) {
        let eventElId = JSON.parse($(this).attr("data-window-toggle"))[0].id;
        if (!$(`#${eventElId}`).css("display") ||
            $(`#${eventElId}`).css("display") == "none"
        ) {
            OpenWindow(eventElId);
        } else {
            CloseWindow(eventElId);
        }
    });

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
        $("#img-overlay").css("display", "flex");
        $("#custom-zoomed-img").attr("src", e.target.src);
    });


});

function setPointsOutsideBothViewPort(
    insideTop,
    insideBottom,
    insideLeft,
    insideRight,
    updatedPointX,
    updatedPointY
) {
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
    return rect.left >= 0;
}

function insideRightBound(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function insideTopBound(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0;
}

function insideBottomBound(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
}

function resetZoomVariables() {
    scale = 0.8;
    panning = false;
    pointX = 0;
    pointY = 0;
    start = {
        x: 0,
        y: 0,
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