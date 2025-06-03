document.addEventListener("DOMContentLoaded", () => {
    const carousel = document.querySelector(".carousel");
    const prevButton = document.querySelector(".carousel-button.prev");
    const nextButton = document.querySelector(".carousel-button.next");

    if (!carousel || !prevButton || !nextButton) {
        console.warn("Carousel elements not found. Skipping button functionality.");
        return;
    }

    const scrollAmount = () => {
        // Get the first slide to determine its width (including margin)
        const firstSlide = carousel.querySelector(".carousel__slide");
        if (firstSlide) {
            // Get the computed style for margin
            const slideStyle = window.getComputedStyle(firstSlide);
            const slideMarginRight = parseFloat(slideStyle.marginRight);
            // Consider the slide width plus its right margin for scrolling
            // This assumes all slides are roughly the same width for simplicity
            return firstSlide.offsetWidth + slideMarginRight;
        }
        // Fallback scroll amount if slide width cannot be determined
        return 300;
    };

    nextButton.addEventListener("click", () => {
        carousel.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });

    prevButton.addEventListener("click", () => {
        carousel.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });

    // Optional: Disable buttons at ends of scroll
    const updateButtonStates = () => {
        const currentScroll = carousel.scrollLeft;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;

        prevButton.disabled = currentScroll <= 0;
        nextButton.disabled = currentScroll >= maxScroll -1; // -1 for potential floating point issues
    };

    carousel.addEventListener("scroll", updateButtonStates);
    // Call it once to set initial state
    updateButtonStates();

    // A more robust way to update on resize or content changes might be needed
    // for production, e.g., using ResizeObserver on the carousel or slides.
    // For now, this covers basic functionality.
    window.addEventListener("resize", updateButtonStates);


    console.log("Advanced skills wallet script loaded and carousel buttons initialized.");
});
