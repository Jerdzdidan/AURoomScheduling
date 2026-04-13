import { usePage, Head } from "@inertiajs/react";
import Base from "@/Layouts/Base";

export default function Home() {
    return (
        <>
            <Head title="Home" />

            <Base title="Home">
                <h3>Hello World</h3>
            </Base>
        </>
    );
}
