import { Users, Mountain, Map, Award } from "lucide-react";

const stats = [
  {
    icon: Users,
    number: "20+",
    label: "Local Hikers",
    description: "Join our Munich community"
  },
  {
    icon: Mountain,
    number: "15+",
    label: "Alpine Trails",
    description: "Around Tegernsee & Munich"
  },
  {
    icon: Map,
    number: "5",
    label: "Key Areas",
    description: "Munich, Tegernsee, Bad Tölz & more"
  },
  {
    icon: Award,
    number: "4.6/5",
    label: "Match Success",
    description: "Happy hiking pairs"
  }
];

const Statistics = () => {
  return (
    <section className="py-8 sm:py-20 bg-primary text-primary-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-8">
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">
            Your Local Hiking Community
          </h2>
          <p className="text-primary-white/80 max-w-2xl mx-auto text-sm sm:text-base">
            Connect with fellow hikers in the Munich and Tegernsee region
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 sm:p-6 rounded-xl bg-primary-white/10 backdrop-blur-sm"
            >
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-primary-white/20 flex items-center justify-center mb-2 sm:mb-4">
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{stat.number}</h3>
              <p className="font-medium text-xs sm:text-base mb-1">{stat.label}</p>
              <p className="text-xs sm:text-sm text-primary-white/70">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Statistics; 