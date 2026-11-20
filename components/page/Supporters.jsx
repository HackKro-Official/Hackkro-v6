import { Instagram, Linkedin, Twitter } from "lucide-react";

const teamMembers = [
  {
    name: (
      <a
        href="https://www.hackkro.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:underline"
      >
        HackKro Engine
        
      </a>
    ),
    image:
      "https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png",
      description:
      "End-to-end competition management, live leaderboards, and automated evaluation tools.",
  },
  {
    name: (
      <a
        href="https://hackkro.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:underline"
      >
        HackKro Campus Network
      </a>
    ),
    image:
      "https://res.cloudinary.com/payb7fsq/image/upload/v1791981789/Hack_Kro_Logo.png",
    description:
      "Partnering with student clubs, tech societies, and developer communities across India to drive participation.",
  },
  
];

export default function Supporters() {
  return (
    <section className="container py-20">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Our Ecosystem
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-gray-600 dark:text-gray-400 text-lg">
         
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
  {teamMembers.map((member, index) => (
    <div
      key={index}
      className="group bg-card border border-border rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-8 text-center hover:-translate-y-1"
    >
      {/* Increased image size */}
      <img
        src={member.image}
        alt="Team member"
        className="mx-auto mb-4 h-20 w-20 rounded-full object-cover group-hover:scale-105 transition-transform duration-300 shadow-sm"
      />
      <h3 className="text-2xl font-bold text-foreground mb-2">
        {member.name}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {member.description}
      </p>
    </div>
  ))}
</div>

    </section>
  );
}
