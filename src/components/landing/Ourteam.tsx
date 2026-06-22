import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import docDowner from '@/assets/doctor-hero.png';
import docJohn from '@/assets/doc-john.png';
import docAviles from '@/assets/doc-david.png';
import docPalmore from '@/assets/doc-sarah.png';

export interface TeamMember {
  id: string | number;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  location: string;
  yearsExperience: number;
  image: string;
}

const DEFAULT_TEAM: TeamMember[] = [
  {
    id: 1,
    name: 'Dr. Downer',
    specialty: 'Orthopedic',
    rating: 4.5,
    reviewCount: 35,
    location: 'Los Angeles, CA',
    yearsExperience: 12,
    image: docDowner,
  },
  {
    id: 2,
    name: 'Dr. John Doe',
    specialty: 'Dentist',
    rating: 4.5,
    reviewCount: 35,
    location: 'Austin, TX',
    yearsExperience: 8,
    image: docJohn,
  },
  {
    id: 3,
    name: 'Dr. Aviles',
    specialty: 'Neurologist',
    rating: 4.5,
    reviewCount: 35,
    location: 'New York, NY',
    yearsExperience: 15,
    image: docAviles,
  },
  {
    id: 4,
    name: 'Dr. Palmore',
    specialty: 'Immunologist',
    rating: 4.5,
    reviewCount: 35,
    location: 'Waipahu, HI',
    yearsExperience: 6,
    image: docPalmore,
  },
];

interface OurTeamProps {
  members?: TeamMember[];
}

function OurTeam({ members = DEFAULT_TEAM }: OurTeamProps) {
  return (
    <section className="w-full px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-primary/90">
          Meet the specialists
        </p>
        <h2 className="mt-1 font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Our Team
          <span className="ml-1 text-base leading-none text-[hsl(var(--primary-glow))]">+</span>
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member) => (
          <Link
            key={member.id}
            to={`/doctors/${member.id}`}
            className="group flex flex-col overflow-hidden rounded-sm border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
          >
            {/* Photo — reduced height */}
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
              <img
                src={member.image}
                alt={member.name}
                className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute right-2 top-2 rounded-sm bg-card/95 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
                {member.specialty}
              </span>
            </div>

            {/* Info — no background */}
            <div className="px-3.5 pt-3 pb-3">
              <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                {member.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {member.specialty}
              </p>

              {/* Stat row */}
              <div className="mt-3 grid grid-cols-2 divide-x divide-border rounded-sm border border-border overflow-hidden">
                <div className="flex items-center justify-center gap-1.5 py-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {member.location}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 py-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    {member.yearsExperience}
                  </span>
                  <span className="text-[10px] text-muted-foreground">yrs exp</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default OurTeam;