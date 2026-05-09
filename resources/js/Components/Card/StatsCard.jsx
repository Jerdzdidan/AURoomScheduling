
export default function StatsCard({ className = '', bgColor, title, iconSize, id, Icon, value }) {
    return (
        <div className={`${className} my-1 my-md-0`}>
            <div className={`card ${bgColor} h-100 text-white shadow-lg border-0`}>
                <div className="card-body">
                    <div className="d-flex justify-content-between">
                        <div>
                            <h6 className="card-title mb-0 text-white fw-semibold">{title}</h6>
                            <h4 className="mb-0 text-white" id={id}>{value !== undefined ? value : '-'}</h4>
                        </div>
                        <div className="align-self-center">
                            {Icon && <Icon size={iconSize} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
