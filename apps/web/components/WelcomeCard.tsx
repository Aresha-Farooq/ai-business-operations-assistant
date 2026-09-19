type WelcomeCardProps = {
  name: string;
};

export default function WelcomeCard({
  name,
}: WelcomeCardProps) {
  return (
    <div>
      <h2>Welcome, {name}</h2>
      <p>AI Business Operations Assistant</p>
    </div>
  );
}