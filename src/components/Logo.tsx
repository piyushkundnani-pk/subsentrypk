import { Droplet } from 'lucide-react';

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <Droplet className="w-5 h-5 text-primary-foreground" fill="currentColor" />
      </div>
      <span className="font-bold text-xl text-foreground">SubSentry</span>
    </div>
  );
};
