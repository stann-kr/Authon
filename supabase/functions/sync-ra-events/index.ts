import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // RA Club URL from env or request payload
    let { clubUrl, venueId } = await req.json().catch(() => ({}));

    // Default to the provided club URL if not specified in request
    if (!clubUrl) {
      clubUrl = "https://ra.co/clubs/106806";
    }

    if (!venueId) {
      // If venueId is not provided, try to find the first club venue
      const { data: venues } = await supabaseClient
        .from("venues")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1);

      if (venues && venues.length > 0) {
        venueId = venues[0].id;
      } else {
        throw new Error("No venue found to associate events with.");
      }
    }

    console.log(`Scraping events for club: ${clubUrl}, venueId: ${venueId}`);

    // Fetch the RA club page
    const response = await fetch(clubUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch RA page: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: any[] = [];

    // RA's Next Events List Container
    // We look for list items that contain event links
    $(
      'ul[data-tracking-id="events-list"] > li, div[data-tracking-id="event-listing"]',
    ).each((_, el) => {
      const $el = $(el);

      // Find the main event link
      const titleLink = $el.find('a[href^="/events/"]');
      if (titleLink.length === 0) return;

      const eventUrlPath = titleLink.attr("href");
      const event_url = eventUrlPath ? `https://ra.co${eventUrlPath}` : null;

      // Extract ra_event_id from URL (e.g., /events/1896200 -> 1896200)
      const ra_event_id = eventUrlPath ? eventUrlPath.split("/").pop() : null;
      if (!ra_event_id) return;

      const title =
        titleLink.find("h3, span").first().text().trim() ||
        titleLink.text().trim();

      // Look for date strings, usually in a span or div before/near the title
      // Date format is usually something like "Fri, 20 Mar" or "20 Mar 2024"
      // We will extract text and try to parse it, or get it from specific data attributes if available
      let dateText = $el.find('[data-tracking-id="event-date"]').text().trim();
      if (!dateText) {
        // Fallback: look for generic text that looks like a date
        // This is highly dependent on RA's dom structure at the time
        dateText = $el
          .find("div, span")
          .filter(function () {
            return /^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2}/.test(
              $(this).text().trim(),
            );
          })
          .first()
          .text()
          .trim();
      }

      // Convert dateText to Date object (basic parsing, assumes current year if missing)
      let eventDate = new Date();
      if (dateText) {
        // Very basic parsing attempt. RA usually uses "Fri, 22 Nov"
        // We'll just rely on JS Date parser if we append the current year
        const currentYear = new Date().getFullYear();
        const dateStringMatches = dateText.match(/(\d{1,2})\s+([A-Za-z]{3})/);
        if (dateStringMatches) {
          const day = dateStringMatches[1];
          const month = dateStringMatches[2];
          eventDate = new Date(`${month} ${day} ${currentYear}`);
          // Check if date is in the past (e.g. scraping in Jan for a Dec event), adjust year
          if (
            eventDate < new Date(new Date().setMonth(new Date().getMonth() - 2))
          ) {
            eventDate.setFullYear(currentYear + 1);
          }
        }
      }

      // Format date to YYYY-MM-DD
      const formattedDate = eventDate.toISOString().split("T")[0];

      // Find image URL
      let image_url = $el.find("img").attr("src");
      if (!image_url) {
        // Sometimes it's a background image
        const bgImge = $el.find('[style*="background-image"]').attr("style");
        if (bgImge) {
          const match = bgImge.match(/url\(["']?(.*?)["']?\)/);
          if (match) image_url = match[1];
        }
      }

      if (title && ra_event_id) {
        events.push({
          venue_id: venueId,
          ra_event_id,
          title,
          date: formattedDate,
          image_url,
          event_url,
        });
      }
    });

    console.log(`Found ${events.length} events.`);

    // Upsert events into Supabase
    let insertedCount = 0;
    if (events.length > 0) {
      const { data, error } = await supabaseClient
        .from("events")
        .upsert(events, { onConflict: "venue_id, ra_event_id" })
        .select();

      if (error) {
        console.error("Error inserting events:", error);
        throw error;
      }
      insertedCount = data?.length || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${events.length} events from RA.`,
        inserted_or_updated: insertedCount,
        events,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
