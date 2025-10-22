import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils";

interface Activity {
  id: number;
  type: string;
  title: string;
  author: string;
  authorId: number;
  class?: string;
  classId?: number;
  timestamp: Date;
}

interface ActivityItemProps {
  activity: Activity;
  iconComponent: ReactNode;
  iconClass: string;
}

const ActivityItem = ({ activity, iconComponent, iconClass }: ActivityItemProps) => {
  return (
    <div className="flex items-start space-x-4">
      <div className={cn("p-2 rounded-full", iconClass)}>
        {iconComponent}
      </div>
      <div className="flex-1">
        <p className="font-medium">
          <span className="text-primary">{activity.author}</span> {getActivityText(activity.type)} <span className="text-primary">{activity.class}</span>
        </p>
        <p className="text-sm text-neutral-500">{getRelativeTime(new Date(activity.timestamp))}</p>
      </div>
    </div>
  );
};

function getActivityText(type: string): string {
  switch (type) {
    case 'note':
      return 'uploaded new notes to';
    case 'homework':
      return 'created a new assignment for';
    case 'quiz':
      return 'published a new quiz for';
    case 'lecture':
      return 'uploaded a new lecture for';
    case 'dpp':
      return 'created new daily practice problems for';
    case 'sample_paper':
      return 'uploaded a new sample paper for';
    default:
      return 'added new content to';
  }
}

function getActivityIcon(type: string): {component: ReactNode, class: string} {
  switch (type) {
    case 'note':
      return { 
        component: <span className="material-icons text-sm">upload_file</span>,
        class: "bg-primary/10 text-primary"
      };
    case 'homework':
      return { 
        component: <span className="material-icons text-sm">assignment</span>,
        class: "bg-accent/10 text-accent"
      };
    case 'quiz':
      return { 
        component: <span className="material-icons text-sm">quiz</span>,
        class: "bg-secondary/10 text-secondary"
      };
    case 'dpp':
      return { 
        component: <span className="material-icons text-sm">leaderboard</span>,
        class: "bg-secondary/10 text-secondary"
      };
    case 'lecture':
      return { 
        component: <span className="material-icons text-sm">videocam</span>,
        class: "bg-primary/10 text-primary"
      };
    case 'sample_paper':
      return { 
        component: <span className="material-icons text-sm">description</span>,
        class: "bg-accent/10 text-accent"
      };
    default:
      return { 
        component: <span className="material-icons text-sm">insert_drive_file</span>,
        class: "bg-primary/10 text-primary"
      };
  }
}

interface ActivityCardProps {
  title: string;
  activities: Activity[];
  viewAllLink?: string;
  className?: string;
}

export function ActivityCard({ title, activities, viewAllLink, className }: ActivityCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="border-b border-neutral-200 p-4 flex justify-between items-center">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {viewAllLink && (
          <a href={viewAllLink} className="text-primary hover:text-primary-dark text-sm font-medium">
            View All
          </a>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const { component, class: iconClass } = getActivityIcon(activity.type);
              return (
                <ActivityItem 
                  key={activity.id}
                  activity={activity}
                  iconComponent={component}
                  iconClass={iconClass}
                />
              );
            })
          ) : (
            <p className="text-neutral-500 text-center py-4">No recent activities</p>
          )}
        </div>
        {viewAllLink && activities.length > 0 && (
          <div className="mt-4 text-center">
            <a href={viewAllLink} className="text-primary hover:text-primary-dark font-medium">
              View All Activity
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
