export default function CarouselSlide ({ imagePath, isActive }) {
    return (
        <div className={`carousel-item ${isActive ? 'active' : ''}`}>
            <div className="bg-slide" style={{ backgroundImage: `url('${imagePath}')` }}>
                <div className="overlay"></div>
            </div>
        </div>
    );
}
