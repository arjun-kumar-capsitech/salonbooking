
const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center mt-30">
      
      <img
        src="https://cdni.iconscout.com/illustration/premium/thumb/not-found-illustration-svg-download-png-3861659.png"
        alt="Not Found"
        className="w-80"
      />

      <h1 className="text-4xl font-semibold text-black mb-4">
        404 - Page Not Found
      </h1>

      <p className="text-gray-800 mb-6">
        Sorry, the page you are looking for does not exist.
      </p>
    </div>
  );
};

export default NotFound;