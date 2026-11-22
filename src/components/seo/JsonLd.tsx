import { serializeJsonLd, type JsonLdObject } from "@/lib/structuredData";

interface JsonLdProps {
  data: JsonLdObject | JsonLdObject[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // Safe: output of serializeJsonLd has "<" escaped.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export default JsonLd;
