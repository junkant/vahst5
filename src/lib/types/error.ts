// src/lib/types/error.ts
export interface ErrorMessage {
  heading: string;
  subtext: string;
}

export interface ErrorPageContext {
  status: number;
  message: string;
  isAuthenticated: boolean;
}

export const ERROR_MESSAGES: Record<number, ErrorMessage> = {
  400: {
    heading: "Bad Request",
    subtext: "The request couldn't be understood. Time to check those parameters."
  },
  401: {
    heading: "Access Denied",
    subtext: "You need proper credentials to access this area. Time to sign in."
  },
  403: {
    heading: "Forbidden Territory",
    subtext: "You don't have permission to access this resource. Contact your admin."
  },
  404: {
    heading: "Page Not Found",
    subtext: "This page seems to have wandered off. Let's get you back on track."
  },
  500: {
    heading: "Server Error",
    subtext: "Something went wrong on our end. Our team has been notified."
  },
  503: {
    heading: "Service Unavailable",
    subtext: "We're performing maintenance. Check back in a few moments."
  }
};