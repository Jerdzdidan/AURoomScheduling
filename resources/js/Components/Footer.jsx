export default function Footer() {
    return (
        <>
            <footer className="content-footer footer bg-footer-theme">
                <div className="container-fluid">
                    <div
                    className="footer-container d-flex align-items-center justify-content-between py-0 flex-md-row flex-column">
                        <div className="mb-2 mb-md-0">
                            © {new Date().getFullYear()}, made by <a href="https://www.facebook.com/jdgonzdayao" target="_blank" className="footer-link"> Jerdan Gondayao</a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
