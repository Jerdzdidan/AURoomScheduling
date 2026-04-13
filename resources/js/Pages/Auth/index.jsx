import { usePage, Head } from "@inertiajs/react";
import { useForm } from "@inertiajs/react";
import Carousel from "@/Layouts/Carousel";
import CarouselSlide from "@/Components/Carousel/CarouselSlide";

const carouselImages = [
    '/img/auth/login_carousel/au-main_1.jpg',
    '/img/auth/login_carousel/au-malabon-elisa.jpg',
    '/img/auth/login_carousel/au-malabon-rizal.jpg',
    '/img/auth/login_carousel/au-pasay-abad.jpg',
    '/img/auth/login_carousel/au-pasay-mabini.jpg',
    '/img/auth/login_carousel/au-pasig.jpg',
    '/img/auth/login_carousel/au-plaridel-1.jpg',
];

export default function Auth() {
    const { flash, errors } = usePage().props;

    const { data, setData, post, processing } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('auth.authenticate'));
    };

    return (
        <>
            <Head title="Login" />

            <Carousel>
                {carouselImages.map((imgPath, index) => (
                    <CarouselSlide
                        key={index}
                        imagePath={imgPath}
                        isActive={index === 0}
                    />
                ))}
            </Carousel>

            <div className="container-xxl">
                <div className="authentication-wrapper authentication-basic container-p-y">
                    <div className="authentication-inner">
                        <div className="card px-sm-6 px-0">
                            <div className="card-body">

                                {/* Logo */}
                                <div className="app-brand justify-content-center">
                                    <span className="app-brand-logo demo">
                                        <span className="text-primary">
                                            <img src="/img/logo/arellano_logo.png" id="logo_img" alt="Arellano Logo" />
                                        </span>
                                    </span>
                                </div>

                                {/* Greeting */}
                                <div className="d-flex align-items-center">
                                    <h4 className="mb-1">Welcome!</h4>
                                    <img src="/img/auth/hand.gif" id="hand_gif" className="mb-2" alt="Wave" />
                                </div>
                                <p className="mb-6">Arellano University - Room Scheduling System</p>
                                {/* Flash Messages */}
                                {flash?.error && (
                                    <div className="alert alert-danger alert-dismissible" role="alert">
                                        {flash.error}
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}
                                {flash?.success && (
                                    <div className="alert alert-success alert-dismissible" role="alert">
                                        {flash.success}
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}
                                {/* Validation Errors */}
                                {Object.keys(errors).length > 0 && (
                                    <div className="alert alert-danger alert-dismissible" role="alert">
                                        {Object.values(errors).map((error, index) => (
                                            <div key={index}>{error}</div>
                                        ))}
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}
                                {/* Login Form */}
                                <form id="formAuthentication" onSubmit={submit} className="mb-6">
                                    <div className="mb-6">
                                        <label htmlFor="email">Email:</label>
                                        <input
                                            type="email"
                                            id="email"
                                            className="form-control"
                                            placeholder="Enter your email"
                                            autoFocus
                                            maxLength="150"
                                            required
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                        />
                                    </div>
                                    <div className="mb-6 form-password-toggle">
                                        <label htmlFor="password">Password:</label>
                                        <div className="input-group input-group-merge">
                                            <input
                                                type="password"
                                                id="password"
                                                className="form-control"
                                                placeholder="••••••••••••"
                                                required
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                            />
                                            <span className="input-group-text cursor-pointer"><i className="icon-base bx bx-hide"></i></span>
                                        </div>
                                    </div>
                                    <div className="mb-8">
                                        <div className="d-flex justify-content-between">
                                            <div className="form-check mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="remember-me"
                                                    checked={data.remember}
                                                    onChange={(e) => setData('remember', e.target.checked)}
                                                />
                                                <label className="form-check-label" htmlFor="remember-me"> Remember Me </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <button className="btn btn-primary d-grid w-100" type="submit" disabled={processing}>
                                            {processing ? 'Loading...' : 'Login'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
