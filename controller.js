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

class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
let imgOverlay, zoomedImgWrapper, customImg;

class ImageInteractionProps {
    constructor() {
        this.scale = 0.8;
        this.panning = false;
        this.pinching = false;
        this.pinchingSensitivity = 1.03;
        this.scrollingSensitivity = 1.05;
        this.pinchingThreshold = 5;
        this.previousPinch = 0;
        this.scaleBounds = new Position(0.8, 3);
        this.currentPos = new Position(0, 0);
        this.startPos = new Position(0, 0);
        this.widthDifference = 0;
        this.heightDifference = 0;
        this.defaultScrollTimer = 1000;
        this.scrollTimer;
    }
}
let defaultProperties = new ImageInteractionProps();
let current = new ImageInteractionProps();

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
            StartTouch(touch.clientX, touch.clientY);
        }
    }

    function OnMouseDown(e) {
        e.preventDefault();
        StartTouch(e.clientX, e.clientY);
        current.panning = true;
    }

    function StartTouch(positionX, positionY) {
        current.startPos = new Position(positionX - current.currentPos.x, positionY - current.currentPos.y);
    }

    //Move functions
    function OnTouchMove(e) {
        if (currentState == TouchState.PANNING) {
            var touch = e.touches[0] || e.changedTouches[0];
            StartMove(touch.clientX, touch.clientY);
        } else if (currentState == TouchState.PINCHING) {
            OnPinch(e);
        }
    }

    function OnMouseMove(e) {
        if (!current.panning) { return; }
        e.preventDefault();
        StartMove(e.clientX, e.clientY);
    }

    function StartMove(positionX, positionY) {
        setTransform(positionX - current.startPos.x, positionY - current.startPos.y);
        HandleCloseButton();
    }

    //Scale functions
    function OnWheel(e) {
        e.preventDefault();
        OnScale(e.wheelDelta ? e.wheelDelta : -e.deltaY,
            defaultProperties.scrollingSensitivity);
    }

    function OnPinch(e) {
        var currentPinch = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY);

        if (current.previousPinch == 0) {
            current.previousPinch = currentPinch;
        } else {
            if (Math.abs(currentPinch - current.previousPinch) > defaultProperties.pinchingThreshold) {
                e.preventDefault();
                if (currentPinch < current.previousPinch) OnScale(-1, defaultProperties.pinchingSensitivity);
                else OnScale(1, defaultProperties.pinchingSensitivity);
                current.previousPinch = currentPinch;
            }
        }
    }

    function OnScale(delta, sensitivity = 1.1) {
        delta > 0 ? (current.scale *= sensitivity) : (current.scale /= sensitivity);
        current.scale = Math.min(Math.max(current.scale, current.scaleBounds.x), current.scaleBounds.y);
        setTransform();
        HandleCloseButton();
    }

    function HandleCloseButton() {

        let wrapperClientWidth = zoomedImgWrapper.getBoundingClientRect().width;
        let wrapperClientHeight = zoomedImgWrapper.getBoundingClientRect().height;

        let widthOverflow = wrapperClientWidth > window.innerWidth;
        let heightOverflow = wrapperClientHeight > window.innerHeight;

        clearTimeout(current.scrollTimer);

        if (widthOverflow || heightOverflow) {
            $("#img-overlay")
                .find("#scaledClose").css("display", "none")
        } else {
            $("#img-overlay")
                .find("#close").css("display", "none")
        }

        current.scrollTimer = setTimeout(function() {
            if (widthOverflow || heightOverflow) {
                $("#img-overlay")
                    .find("#scaledClose").fadeIn(200, "linear")
            } else {
                $("#img-overlay")
                    .find("#close").fadeIn(200, "linear")
            }
        }, current.defaultScrollTimer);
    }

    //End functions
    function OnMouseUp(e) {
        e.preventDefault();
        current.panning = false;
    }

    function OnTouchEnd(e) {
        if (e.touches.length >= 2) {
            currentState = TouchState.PINCHING;
        } else if (e.touches.length === 1) {
            current.previousPinch = 0;
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
            current = new ImageInteractionProps();
            defaultProperties = new ImageInteractionProps();
            setTimeout(() => {
                $('#zoomed-img-wrapper').css('transform', 'translate(0px, 0px) scale(0.8)');
                $("#custom-zoomed-img").attr("src", "");
            }, 250)
        }
    });

    $("#img-overlay")
        .find("#close")
        .click(function() {
            CloseWindow("img-overlay");
            current = new ImageInteractionProps();
            defaultProperties = new ImageInteractionProps();
            setTimeout(() => {
                $('#zoomed-img-wrapper').css('transform', 'translate(0px, 0px) scale(0.8)');
                $("#custom-zoomed-img").attr("src", "");
            }, 250)
        });

    $("#img-overlay")
        .find("#scaledClose")
        .click(function() {

            CloseWindow("img-overlay");
            current = new ImageInteractionProps();
            defaultProperties = new ImageInteractionProps();
            setTimeout(() => {
                $('#zoomed-img-wrapper').css('transform', 'translate(0px, 0px) scale(0.8)');
                $("#custom-zoomed-img").attr("src", "");
            }, 250)
        });

    $(".bg-veil").click(function(e) {
        CloseWindow(e.target.parentElement.id);
    });

    $(".custom-img").click(function(e) {
        $("#img-overlay").find("#scaledClose").css("display", "none")
        $("#img-overlay").find("#close").css("display", "flex")
        $("#img-overlay").css("display", "flex");
        $("#custom-zoomed-img").attr("src", e.target.src);
        current.widthDifference = (window.innerWidth - zoomedImgWrapper.getBoundingClientRect().width) / 2
        current.heightDifference = (window.innerHeight - zoomedImgWrapper.getBoundingClientRect().height) / 2
        OpenWindow("img-overlay");
    });


});

function zoomInImage() {
    imgOverlay.style.display = "flex";
    let imageSrc = customImg.src;
    document.getElementById("custom-zoomed-img").src = imageSrc;
}

function zoomOutImage() {
    CloseWindow("img-overlay");
    current = new ImageInteractionProps();
    defaultProperties = new ImageInteractionProps();
    zoomedImgWrapper.style.transform = "scale(" + defaultProperties.scale + ") translate(0 px, 0 px)";
}

function setTransform(posX = 0, posY = 0) {
    zoomedImgWrapper.style.transform =
        "translate(" + current.currentPos.x + "px, " + current.currentPos.y + "px) scale(" + current.scale + ")";

    let translation = GetCurrentTranslation(zoomedImgWrapper);

    if (posX == 0) posX = translation.x;
    if (posY == 0) posY = translation.y;

    let wrapperClientWidth = zoomedImgWrapper.getBoundingClientRect().width;
    let wrapperClientHeight = zoomedImgWrapper.getBoundingClientRect().height;

    let widthOverflow = wrapperClientWidth > window.innerWidth;
    let heightOverflow = wrapperClientHeight > window.innerHeight;



    if (widthOverflow && heightOverflow) {

        $("#img-overlay")
            .find("#close").css("display", "none")

        let preTop = $("#img-overlay").find("#close").css("top")
        $("#img-overlay")
            .find("#scaledClose").css("top", preTop)

        let preRight = $("#img-overlay").find("#close").css("right")
        $("#img-overlay")
            .find("#scaledClose").css("right", preRight)

        $("#img-overlay")
            .find("#scaledClose").css("display", "block")

        var clampX = (wrapperClientWidth - window.innerWidth) / 2;
        current.currentPos.x = Math.min(Math.max(posX, -clampX), clampX);
        var clampY = (wrapperClientHeight - window.innerHeight) / 2;
        current.currentPos.y = Math.min(Math.max(posY, -clampY), clampY);


    } else if (widthOverflow) {

        $("#img-overlay")
            .find("#close").css("display", "none")
        $("#img-overlay")
            .find("#scaledClose").css("display", "block")

        let existingDiff = current.heightDifference;
        let customH = (window.innerHeight - wrapperClientHeight) / 2;
        let preTop = parseInt($("#img-overlay").find("#close").css("top"), 10);

        if (customH >= preTop) {

            let total = customH + preTop
            $("#img-overlay")
                .find("#scaledClose").css("top", `${total}px`)

            if (existingDiff > customH) {
                console.log("Image Width Overflow Increasing")
            } else if (existingDiff < customH) {
                console.log("Image Width Overflow Decreasing")
            }

            current.heightDifference = customH
        }

        var clampX = (wrapperClientWidth - window.innerWidth) / 2;
        current.currentPos.x = Math.min(Math.max(posX, -clampX), clampX);

    } else if (heightOverflow) {

        $("#img-overlay")
            .find("#close").css("display", "none")
        $("#img-overlay")
            .find("#scaledClose").css("display", "block")

        let existingDiff = current.widthDifference
        let customW = (window.innerWidth - wrapperClientWidth) / 2;
        let preRight = parseInt($("#img-overlay").find("#close").css("right"), 10);

        if (customW >= preRight) {

            let total = customW + preRight
            $("#img-overlay")
                .find("#scaledClose").css("right", `${total}px`)

            if (existingDiff > customW) {
                console.log("Image Height Overflow Increasing")
            } else if (existingDiff < customW) {
                console.log("Image Height Overflow Decreasing")
            }

            current.widthDifference = customW
        }

        var clampY = (wrapperClientHeight - window.innerHeight) / 2;
        current.currentPos.y = Math.min(Math.max(posY, -clampY), clampY);

    } else {
        current.currentPos.y = 0;
        $("#img-overlay")
            .find("#close").css("display", "block")

        $("#img-overlay")
            .find("#scaledClose").css("display", "none")

        current.currentPos.x = 0;
    }

    zoomedImgWrapper.style.transform =
        "translate(" + current.currentPos.x + "px, " + current.currentPos.y + "px) scale(" + current.scale + ")";
}

function GetCurrentTranslation(element) {
    const style = window.getComputedStyle(element)
    const matrix = new DOMMatrixReadOnly(style.transform)
    return {
        x: matrix.m41,
        y: matrix.m42
    }
}

function getKrpanoViewParameters() {
    krpano = document.getElementById("krpanoSWFObject");
    if (krpano) {
        return {
            startscene: krpano.get("xml.scene"),
            hlookat: (parseFloat(krpano.get("view.hlookat")) % 360).toFixed(2),
            vlookat: parseFloat(krpano.get("view.vlookat")).toFixed(2),
        };
    }
    console.warn("failed to get parameters.");
    return null;
}