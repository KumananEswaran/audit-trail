"use client";
import ClipLoader from "react-spinners/ClipLoader";

const overide = {
	display: "block",
	margin: "100px auto",
};

const LoadingPage = () => {
	return (
		<ClipLoader
			color="#3b82f6"
			cssOverride={overide}
			size={150}
			aria-label="Loading Spinner"
		/>
	);
};

export default LoadingPage;
