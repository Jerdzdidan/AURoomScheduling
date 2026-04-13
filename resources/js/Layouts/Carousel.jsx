export default function Carousel({ children }) {
    return (
        <div id="backgroundCarousel" className="carousel slide carousel-fade" data-bs-ride="carousel" data-bs-interval="3000">
            <div className="carousel-inner">
                {children}
            </div>
        </div>
    );
}
