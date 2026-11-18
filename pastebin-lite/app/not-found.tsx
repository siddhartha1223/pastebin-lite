export default function NotFound() {
  return (
    <div>
      <h2>Paste unavailable</h2>
      <p role="alert">This paste does not exist, has expired, or has reached its view limit.</p>
      <a href="/">Create a new paste</a>
    </div>
  );
}
