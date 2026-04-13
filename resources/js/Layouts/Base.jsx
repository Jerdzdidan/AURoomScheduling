import Footer from "@/Components/Footer";
import Sidebar from "@/Components/Sidebar/Sidebar";
import Navbar from "@/Components/Navbar";

export default function Base({ title, children }) {
    return (
        <>
            <div className="layout-wrapper layout-content-navbar">
                <div className="layout-container">
                    {/* SideBar */}
                    <Sidebar />

                    <div className="layout-page">
                    {/* Navbar */}
                    <Navbar
                        title={title}
                    />

                    <div className="content-wrapper">
                        <div className="container-fluid flex-grow-1 container-p-y mb-0">
                            <div className="container-fluid ps-0 pe-0">
                                { children }
                            </div>
                        </div>

                        {/* Footer */}
                        <Footer />

                        <div className="content-backdrop fade"></div>
                    </div>
                    </div>
                </div>

                <div className="layout-overlay layout-menu-toggle" onClick={() => window.Helpers.toggleCollapsed()}></div>
            </div>
        </>
    );
}
