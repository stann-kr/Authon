"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import Image from "next/image";
import { format } from "date-fns";

type Event = {
  id: string;
  venue_id: string;
  ra_event_id: string;
  title: string;
  date: string;
  image_url: string;
  event_url: string;
};

interface EventManagementProps {
  onEventSelect: (date: string) => void;
}

export default function EventManagement({
  onEventSelect,
}: EventManagementProps) {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
        .gte("date", new Date().toISOString().split("T")[0]); // Only show today/future events

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEvents = async () => {
    try {
      setSyncing(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-ra-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            clubUrl: "https://ra.co/clubs/106806",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to sync events");
      }

      await fetchEvents();
    } catch (err: any) {
      console.error("Error syncing events:", err);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 text-white font-mono">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-widest uppercase">
            UPCOMING EVENTS
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Fetched from Resident Advisor
          </p>
        </div>
        <button
          onClick={handleSyncEvents}
          disabled={syncing}
          className={`flex items-center gap-2 px-4 py-2 text-sm uppercase tracking-wider font-bold transition-colors border ${
            syncing
              ? "bg-gray-800 text-gray-500 border-gray-700"
              : "bg-black text-white border-white hover:bg-white hover:text-black cursor-pointer"
          }`}
        >
          <i className={`ri-refresh-line ${syncing ? "animate-spin" : ""}`}></i>
          {syncing ? "SYNCING..." : "SYNC RA EVENTS"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 text-red-200 text-sm">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-700">
          <i className="ri-calendar-2-line text-4xl mb-3 block"></i>
          <p>No upcoming events found.</p>
          <p className="text-xs mt-2">
            Click 'Sync RA Events' to fetch latest.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {events.map((event) => {
            const dateObj = new Date(event.date);
            const displayDate = format(dateObj, "MMM dd, yyyy");
            const dayOfWeek = format(dateObj, "EEEE");

            return (
              <div
                key={event.id}
                onClick={() => onEventSelect(event.date)}
                className="group relative flex flex-col bg-black border border-gray-800 hover:border-white transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Image Container */}
                <div className="aspect-[4/5] sm:aspect-square relative overflow-hidden bg-gray-900">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="ri-image-line text-4xl text-gray-700"></i>
                    </div>
                  )}

                  {/* Date Badge overlay */}
                  <div className="absolute top-0 right-0 m-3 bg-white text-black px-3 py-1 font-bold text-center">
                    <div className="text-xs uppercase">
                      {format(dateObj, "MMM")}
                    </div>
                    <div className="text-xl leading-none">
                      {format(dateObj, "dd")}
                    </div>
                  </div>

                  {/* Hover Overlay - "Manage Guests" */}
                  <div className="absolute inset-0 bg-black/60 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:flex">
                    <span className="border border-white px-4 py-2 text-sm font-bold tracking-widest uppercase">
                      MANAGE GUESTS
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-xs text-gray-400 mb-2 font-bold tracking-wider">
                    {dayOfWeek.toUpperCase()}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold leading-snug line-clamp-2 mb-3 flex-1 group-hover:text-gray-300">
                    {event.title}
                  </h3>

                  {event.event_url && (
                    <a
                      href={event.event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} // Prevent card click when clicking RA link
                      className="text-xs text-gray-500 hover:text-white flex items-center gap-1 mt-auto z-10 w-fit"
                    >
                      <i className="ri-external-link-line"></i> View on RA
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
