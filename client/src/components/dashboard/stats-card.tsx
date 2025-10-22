import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconClass?: string;
  trend?: {
    value: string;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  iconClass = "bg-primary/10 text-primary",
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-neutral-500 text-sm mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-full", iconClass)}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            {trend.positive !== undefined && (
              <span className={cn(
                "flex items-center",
                trend.positive ? "text-secondary-light" : "text-destructive"
              )}>
                <span className="material-icons text-sm mr-1">
                  {trend.positive ? "arrow_upward" : "arrow_downward"}
                </span>
                {trend.value}
              </span>
            )}
            {trend.label && (
              <span className="ml-2 text-neutral-500">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
