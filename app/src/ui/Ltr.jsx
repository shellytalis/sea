/** טקסט שמאל-לימין בתוך ממשק RTL: מזהים, מספרים, שמות באנגלית. הרכיב היחיד שמגדיר dir="ltr". */
export function Ltr({ className = '', children, ...rest }) {
  return <bdi {...rest} dir="ltr" className={className || undefined}>{children}</bdi>;
}

/** כמו Ltr, בפונט מונו-ספייס: IMO, MMSI, קואורדינטות, חותמות זמן */
export function Mono({ className = '', children, ...rest }) {
  return <Ltr {...rest} className={`mono ${className}`.trim()}>{children}</Ltr>;
}
