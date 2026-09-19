import WelcomeCard from "@/components/WelcomeCard";
import { db } from "@business-platform/database";
export default function HomePage() {
  return (
    <main>
      <WelcomeCard name="Aresha" />
    </main>
  );
}