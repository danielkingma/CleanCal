// CSS-only device frames for marketing pages (no image-processing
// dependency, no canvas work -- just a styled wrapper around a real
// screenshot). Used on the Handbook and the landing page to show what
// CleanCal actually looks like on a phone vs. a desktop monitor.
//
// phoneSrc/monitorSrc should be real product screenshots. If a real
// portrait phone screenshot isn't available yet, pass the same image to
// both -- the phone frame will still render, just cropped to the middle
// of that image (object-fit: cover) rather than a true phone capture.

interface DeviceShowcaseProps {
  phoneSrc: string;
  phoneAlt: string;
  monitorSrc: string;
  monitorAlt: string;
  phoneCaption?: string;
  monitorCaption?: string;
}

export default function DeviceShowcase({
  phoneSrc,
  phoneAlt,
  monitorSrc,
  monitorAlt,
  phoneCaption,
  monitorCaption,
}: DeviceShowcaseProps) {
  return (
    <div className="device-showcase">
      <figure className="device-fig device-fig-monitor">
        <div className="monitor-frame">
          <div className="monitor-camera" />
          <div className="monitor-screen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={monitorSrc} alt={monitorAlt} />
          </div>
        </div>
        <div className="monitor-stand-neck" />
        <div className="monitor-stand-base" />
        {monitorCaption ? <figcaption>{monitorCaption}</figcaption> : null}
      </figure>

      <figure className="device-fig device-fig-phone">
        <div className="phone-frame">
          <div className="phone-camera" />
          <div className="phone-screen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={phoneSrc} alt={phoneAlt} />
          </div>
          <div className="phone-side-btn phone-side-btn-vol" />
          <div className="phone-side-btn phone-side-btn-power" />
        </div>
        {phoneCaption ? <figcaption>{phoneCaption}</figcaption> : null}
      </figure>
    </div>
  );
}
