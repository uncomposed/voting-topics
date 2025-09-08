set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
STARTER="${STARTER:-${ROOT_DIR}/starter-pack.v2.4.json}"
OUTDIR="${OUTDIR:-${ROOT_DIR}/politician-pref-sets/politician-json}"
mkdir -p "$OUTDIR"
command -v jq >/dev/null
echo "Using STARTER=$STARTER" >&2
[ -s "$STARTER" ] || { echo "Missing STARTER at $STARTER" >&2; exit 1; }
jq -e '.version=="tsb.v1" and (.topics|type=="array")' "$STARTER" >/dev/null

PARTY_DEFAULTS=$(cat <<'JSON'
{
  "D": {
    "topic-economy-work": {"dir-lw1":5,"dir-lw2":4,"dir-lw3":4,"dir-lw4":4,"dir-lw5":5,"dir-ec1":4,"dir-ec2":4,"dir-ec3":4,"dir-ec4":4,"dir-ec5":4,"dir-ec6":4,"dir-ec7":3,"dir-ec8":3,"dir-ip1":4,"dir-ip2":4,"dir-ip3":3},
    "topic-taxes": {"dir-ta1":5,"dir-ta2":4,"dir-ta3":4,"dir-ta4":4,"dir-ta5":4},
    "topic-healthcare": {"dir-he1":5,"dir-he2":4,"dir-he3":5},
    "topic-public-health": {"dir-ph1":5,"dir-ph2":5,"dir-ph3":5,"dir-ph4":5,"dir-ph5":4,"dir-ph6":4},
    "topic-reproductive-health": {"dir-a1":4,"dir-a2":5,"dir-a3":5},
    "topic-climate-change": {"dir-c1":5,"dir-c2":5,"dir-c3":5,"dir-c4":4,"dir-c5":4},
    "topic-energy": {"dir-en1":4,"dir-en2":4,"dir-en3":5,"dir-en4":4,"dir-en5":4},
    "topic-environment": {"dir-e1":5,"dir-e2":5,"dir-e3":4,"dir-e4":4,"dir-e5":5},
    "topic-education": {"dir-ed1":4,"dir-ed2":4,"dir-ed3":4,"dir-ed4":3,"dir-ed5":5,"dir-ed6":5},
    "topic-immigration": {"dir-im1":4,"dir-im2":4,"dir-im3":3,"dir-im4":4,"dir-im5":4,"dir-im6":4},
    "topic-justice-rights-safety": {"dir-cj1":4,"dir-cj2":4,"dir-cj3":5,"dir-cj4":4,"dir-cj5":4,"dir-cr1":5,"dir-cr2":5,"dir-cr3":4,"dir-cr4":5,"dir-ps2":4,"dir-ps3":4,"dir-ps4":4,"dir-ps5":5},
    "topic-elections-campaign-finance": {"dir-v1":5,"dir-v2":4,"dir-v3":4,"dir-v4":4,"dir-v5":4,"dir-cf1":5,"dir-cf2":5,"dir-cf3":4,"dir-cf4":5},
    "topic-governance-judiciary-ethics": {"dir-gov1":4,"dir-gov2":5,"dir-gov3":5,"dir-gov4":4,"dir-gov5":4,"dir-ju1":4,"dir-ju2":4,"dir-ju3":4},
    "topic-foreign-policy-security": {"dir-ia1":5,"dir-ia2":4,"dir-ia3":5,"dir-ia4":4,"dir-ia5":4,"dir-tr1":4,"dir-tr2":4,"dir-tr3":4,"dir-tr4":4,"dir-tr5":3,"dir-mi1":4,"dir-mi2":4,"dir-mi3":4,"dir-mi4":4,"dir-mi5":4,"dir-fp1":4,"dir-fp2":4,"dir-fp3":4,"dir-fp4":4,"dir-fp5":4,"dir-fp6":4},
    "topic-technology-privacy": {"dir-pr1":4,"dir-pr2":4,"dir-pr3":4,"dir-pr4":4,"dir-pr5":4,"dir-te1":5,"dir-te2":4,"dir-te3":4,"dir-te4":4,"dir-te5":4,"dir-te6":4},
    "topic-science-research-innovation": {"dir-sr1":4,"dir-sr2":4,"dir-sr3":4,"dir-sr4":5,"dir-sr5":4},
    "topic-agriculture-rural": {"dir-ag1":3,"dir-ag2":4,"dir-ag3":4},
    "topic-infrastructure-housing": {"dir-h1":5,"dir-h2":4,"dir-h3":4,"dir-h4":4,"dir-h5":5,"dir-in1":4,"dir-in2":4,"dir-in3":4},
    "topic-church-state": {"dir-cs1":5,"dir-cs2":5,"dir-cs3":5,"dir-cs4":4,"dir-cs5":4},
    "topic-cost-of-living": {"dir-col1":4,"dir-col2":4,"dir-col3":5,"dir-col4":4},
    "topic-guns-firearms": {"dir-gf1":5,"dir-gf2":2,"dir-gf3":5,"dir-gf4":4},
    "topic-retirement-security": {"dir-rs1":5,"dir-rs2":5,"dir-rs3":4}
  },
  "R": {
    "topic-economy-work": {"dir-lw1":4,"dir-lw2":4,"dir-lw3":2,"dir-lw4":4,"dir-lw5":3,"dir-ec1":4,"dir-ec2":5,"dir-ec3":4,"dir-ec4":4,"dir-ec5":5,"dir-ec6":4,"dir-ec7":5,"dir-ec8":5,"dir-ip1":5,"dir-ip2":4,"dir-ip3":4},
    "topic-taxes": {"dir-ta1":4,"dir-ta2":5,"dir-ta3":3,"dir-ta4":4,"dir-ta5":5},
    "topic-healthcare": {"dir-he1":2,"dir-he2":3,"dir-he3":3},
    "topic-public-health": {"dir-ph1":3,"dir-ph2":2,"dir-ph3":4,"dir-ph4":3,"dir-ph5":3,"dir-ph6":3},
    "topic-reproductive-health": {"dir-a1":5,"dir-a2":2,"dir-a3":2},
    "topic-climate-change": {"dir-c1":2,"dir-c2":3,"dir-c3":3,"dir-c4":2,"dir-c5":2},
    "topic-energy": {"dir-en1":5,"dir-en2":4,"dir-en3":2,"dir-en4":4,"dir-en5":3},
    "topic-environment": {"dir-e1":3,"dir-e2":2,"dir-e3":3,"dir-e4":3,"dir-e5":2},
    "topic-education": {"dir-ed1":4,"dir-ed2":3,"dir-ed3":4,"dir-ed4":5,"dir-ed5":3,"dir-ed6":2},
    "topic-immigration": {"dir-im1":4,"dir-im2":2,"dir-im3":5,"dir-im4":4,"dir-im5":5,"dir-im6":3},
    "topic-justice-rights-safety": {"dir-cj1":5,"dir-cj2":2,"dir-cj3":2,"dir-cj4":3,"dir-cj5":3,"dir-cr1":2,"dir-cr2":2,"dir-cr3":3,"dir-cr4":3,"dir-ps2":4,"dir-ps3":4,"dir-ps4":5,"dir-ps5":3},
    "topic-elections-campaign-finance": {"dir-v1":3,"dir-v2":3,"dir-v3":3,"dir-v4":5,"dir-v5":5,"dir-cf1":2,"dir-cf2":3,"dir-cf3":5,"dir-cf4":3},
    "topic-governance-judiciary-ethics": {"dir-gov1":4,"dir-gov2":3,"dir-gov3":3,"dir-gov4":4,"dir-gov5":3,"dir-ju1":4,"dir-ju2":4,"dir-ju3":3},
    "topic-foreign-policy-security": {"dir-ia1":3,"dir-ia2":5,"dir-ia3":3,"dir-ia4":4,"dir-ia5":5,"dir-tr1":4,"dir-tr2":5,"dir-tr3":3,"dir-tr4":5,"dir-tr5":5,"dir-mi1":5,"dir-mi2":3,"dir-mi3":4,"dir-mi4":4,"dir-mi5":4,"dir-fp1":4,"dir-fp2":4,"dir-fp3":2,"dir-fp4":3,"dir-fp5":5,"dir-fp6":4},
    "topic-technology-privacy": {"dir-pr1":3,"dir-pr2":3,"dir-pr3":4,"dir-pr4":4,"dir-pr5":3,"dir-te1":3,"dir-te2":3,"dir-te3":3,"dir-te4":5,"dir-te5":3,"dir-te6":5},
    "topic-science-research-innovation": {"dir-sr1":3,"dir-sr2":3,"dir-sr3":3,"dir-sr4":4,"dir-sr5":3},
    "topic-agriculture-rural": {"dir-ag1":4,"dir-ag2":3,"dir-ag3":3},
    "topic-infrastructure-housing": {"dir-h1":3,"dir-h2":3,"dir-h3":2,"dir-h4":5,"dir-h5":2,"dir-in1":4,"dir-in2":4,"dir-in3":4},
    "topic-church-state": {"dir-cs1":4,"dir-cs2":2,"dir-cs3":2,"dir-cs4":5,"dir-cs5":4},
    "topic-cost-of-living": {"dir-col1":5,"dir-col2":4,"dir-col3":3,"dir-col4":5},
    "topic-guns-firearms": {"dir-gf1":3,"dir-gf2":5,"dir-gf3":2,"dir-gf4":4},
    "topic-retirement-security": {"dir-rs1":5,"dir-rs2":5,"dir-rs3":4}
  }
}
JSON
)

MAP=$(cat <<'JSON'
{"candidates":[
{"year":2000,"party":"D","stage":"primary","name":"Al Gore","prefs":{"topic-economy-work":{"dir-ta3":5},"topic-healthcare":{"dir-he1":4,"dir-he3":4},"topic-climate-change":{"dir-c1":5},"topic-environment":{"dir-e2":5},"topic-technology-privacy":{"dir-te3":4},"topic-science-research-innovation":{"dir-sr4":5},"topic-elections-campaign-finance":{"dir-cf2":4}}},
{"year":2000,"party":"D","stage":"primary","name":"Bill Bradley","prefs":{"topic-healthcare":{"dir-he1":5},"topic-elections-campaign-finance":{"dir-cf1":5,"dir-cf2":5,"dir-cf4":4},"topic-justice-rights-safety":{"dir-cr1":5},"topic-guns-firearms":{"dir-gf3":5}}},
{"year":2000,"party":"R","stage":"primary","name":"George W. Bush","prefs":{"topic-taxes":{"dir-ta1":5},"topic-education":{"dir-ed1":5,"dir-ed2":4},"topic-foreign-policy-security":{"dir-mi1":5},"topic-immigration":{"dir-im2":3,"dir-im3":4},"topic-church-state":{"dir-cs4":5},"topic-infrastructure-housing":{"dir-h2":4}}},
{"year":2000,"party":"R","stage":"primary","name":"John McCain","prefs":{"topic-elections-campaign-finance":{"dir-cf1":5,"dir-cf2":5},"topic-taxes":{"dir-ta1":2,"dir-ta3":4},"topic-foreign-policy-security":{"dir-mi1":5,"dir-ia3":4},"topic-guns-firearms":{"dir-gf3":3}}},
{"year":2000,"party":"D","stage":"general","name":"Al Gore","prefs":{"topic-taxes":{"dir-ta3":5},"topic-healthcare":{"dir-he1":4,"dir-he3":4},"topic-climate-change":{"dir-c1":5},"topic-elections-campaign-finance":{"dir-cf2":4},"topic-justice-rights-safety":{"dir-cr1":4},"topic-guns-firearms":{"dir-gf3":4}}},
{"year":2000,"party":"R","stage":"general","name":"George W. Bush","prefs":{"topic-taxes":{"dir-ta1":5},"topic-education":{"dir-ed1":5,"dir-ed2":4},"topic-foreign-policy-security":{"dir-mi1":4},"topic-immigration":{"dir-im2":3,"dir-im3":4},"topic-church-state":{"dir-cs4":5}}},

{"year":2004,"party":"D","stage":"primary","name":"John Kerry","prefs":{"topic-foreign-policy-security":{"dir-ia3":4,"dir-mi3":5},"topic-taxes":{"dir-ta1":5},"topic-economy-work":{"dir-lw1":4},"topic-healthcare":{"dir-he1":4,"dir-he3":3},"topic-energy":{"dir-en2":4},"topic-climate-change":{"dir-c1":3}}},
{"year":2004,"party":"D","stage":"primary","name":"John Edwards","prefs":{"topic-economy-work":{"dir-lw3":5,"dir-lw1":4},"topic-healthcare":{"dir-he1":4},"topic-foreign-policy-security":{"dir-tr2":5}}},
{"year":2004,"party":"R","stage":"primary","name":"George W. Bush","prefs":{"topic-foreign-policy-security":{"dir-mi1":5,"dir-mi3":4},"topic-taxes":{"dir-ta1":5},"topic-healthcare":{"dir-he3":3},"topic-church-state":{"dir-cs4":5},"topic-infrastructure-housing":{"dir-h2":4},"topic-immigration":{"dir-im3":4}}},
{"year":2004,"party":"R","stage":"general","name":"George W. Bush","prefs":{"topic-foreign-policy-security":{"dir-mi1":5,"dir-mi3":4},"topic-taxes":{"dir-ta1":5},"topic-infrastructure-housing":{"dir-h2":4}}},
{"year":2004,"party":"D","stage":"general","name":"John Kerry","prefs":{"topic-foreign-policy-security":{"dir-ia3":4,"dir-mi3":5},"topic-taxes":{"dir-ta1":5},"topic-healthcare":{"dir-he1":4},"topic-economy-work":{"dir-lw1":4}}},

{"year":2008,"party":"D","stage":"primary","name":"Barack Obama","prefs":{"topic-foreign-policy-security":{"dir-mi2":5},"topic-healthcare":{"dir-he1":4,"dir-he2":4},"topic-climate-change":{"dir-c1":5},"topic-energy":{"dir-en3":5},"topic-taxes":{"dir-ta1":5},"topic-governance-judiciary-ethics":{"dir-gov2":4}}},
{"year":2008,"party":"D","stage":"primary","name":"Hillary Clinton","prefs":{"topic-healthcare":{"dir-he1":5},"topic-infrastructure-housing":{"dir-h3":4},"topic-foreign-policy-security":{"dir-mi1":4,"dir-ia3":4},"topic-climate-change":{"dir-c1":5},"topic-justice-rights-safety":{"dir-cr1":5}}},
{"year":2008,"party":"R","stage":"primary","name":"John McCain","prefs":{"topic-foreign-policy-security":{"dir-mi1":5,"dir-ia1":3,"dir-ia3":3},"topic-immigration":{"dir-im1":3,"dir-im3":3},"topic-climate-change":{"dir-c1":4},"topic-taxes":{"dir-ta3":5},"topic-governance-judiciary-ethics":{"dir-gov2":4},"topic-energy":{"dir-en1":5,"dir-en2":4}}},
{"year":2008,"party":"R","stage":"primary","name":"Mike Huckabee","prefs":{"topic-reproductive-health":{"dir-a1":5},"topic-taxes":{"dir-ta2":5},"topic-economy-work":{"dir-lw3":4},"topic-immigration":{"dir-im2":3,"dir-im3":3}}},
{"year":2008,"party":"D","stage":"general","name":"Barack Obama","prefs":{"topic-taxes":{"dir-ta1":5},"topic-climate-change":{"dir-c1":5},"topic-healthcare":{"dir-he1":4},"topic-foreign-policy-security":{"dir-mi2":5}}},
{"year":2008,"party":"R","stage":"general","name":"John McCain","prefs":{"topic-energy":{"dir-en1":5},"topic-immigration":{"dir-im2":4},"topic-climate-change":{"dir-c1":3}}},

{"year":2012,"party":"D","stage":"general","name":"Barack Obama","prefs":{"topic-economy-work":{"dir-lw2":5},"topic-taxes":{"dir-ta1":4},"topic-healthcare":{"dir-he1":5},"topic-climate-change":{"dir-c1":4},"topic-energy":{"dir-en2":3},"topic-foreign-policy-security":{"dir-mi2":4,"dir-ia3":4}}},
{"year":2012,"party":"R","stage":"primary","name":"Mitt Romney","prefs":{"topic-economy-work":{"dir-lw2":5},"topic-taxes":{"dir-ta2":4,"dir-ta5":4,"dir-ta1":3},"topic-healthcare":{"dir-he1":0,"dir-he3":3},"topic-immigration":{"dir-im3":4},"topic-foreign-policy-security":{"dir-mi1":5,"dir-ia2":5,"dir-ia1":4},"topic-reproductive-health":{"dir-a1":4},"topic-energy":{"dir-en1":4,"dir-en2":3}}},
{"year":2012,"party":"R","stage":"primary","name":"Rick Santorum","prefs":{"topic-reproductive-health":{"dir-a1":5},"topic-taxes":{"dir-ta5":5},"topic-immigration":{"dir-im3":4},"topic-economy-work":{"dir-ec5":5}}},
{"year":2012,"party":"R","stage":"general","name":"Mitt Romney","prefs":{"topic-taxes":{"dir-ta2":4,"dir-ta5":4},"topic-immigration":{"dir-im3":4,"dir-im2":2},"topic-energy":{"dir-en1":4}}},

{"year":2016,"party":"D","stage":"primary","name":"Hillary Clinton","prefs":{"topic-healthcare":{"dir-he1":5},"topic-taxes":{"dir-ta1":4},"topic-climate-change":{"dir-c1":5},"topic-guns-firearms":{"dir-gf3":5,"dir-gf1":4},"topic-foreign-policy-security":{"dir-ia3":4},"topic-justice-rights-safety":{"dir-cj3":5},"topic-education":{"dir-ed5":4,"dir-ed6":4}}},
{"year":2016,"party":"D","stage":"primary","name":"Bernie Sanders","prefs":{"topic-healthcare":{"dir-he1":5,"dir-he2":5,"dir-he3":5},"topic-economy-work":{"dir-lw1":5},"topic-climate-change":{"dir-c1":5},"topic-education":{"dir-ed5":5,"dir-ed6":5},"topic-justice-rights-safety":{"dir-cj2":5},"topic-foreign-policy-security":{"dir-mi2":5}}},
{"year":2016,"party":"R","stage":"primary","name":"Donald Trump","prefs":{"topic-immigration":{"dir-im3":5},"topic-foreign-policy-security":{"dir-ia2":5,"dir-mi1":4,"dir-tr2":5},"topic-taxes":{"dir-ta1":4,"dir-ta5":4,"dir-ta2":3},"topic-guns-firearms":{"dir-gf2":5},"topic-reproductive-health":{"dir-a1":4}}},
{"year":2016,"party":"R","stage":"primary","name":"Ted Cruz","prefs":{"topic-taxes":{"dir-ta4":5,"dir-ta1":2},"topic-reproductive-health":{"dir-a1":5},"topic-immigration":{"dir-im3":5},"topic-foreign-policy-security":{"dir-mi1":5},"topic-church-state":{"dir-cs4":4}}},
{"year":2016,"party":"D","stage":"general","name":"Hillary Clinton","prefs":{"topic-healthcare":{"dir-he1":5},"topic-climate-change":{"dir-c1":5},"topic-guns-firearms":{"dir-gf3":5},"topic-foreign-policy-security":{"dir-ia3":4}}},
{"year":2016,"party":"R","stage":"general","name":"Donald Trump","prefs":{"topic-immigration":{"dir-im3":5},"topic-foreign-policy-security":{"dir-ia2":5,"dir-mi1":4,"dir-tr2":5},"topic-taxes":{"dir-ta1":4,"dir-ta5":4},"topic-guns-firearms":{"dir-gf2":5}}},

{"year":2020,"party":"D","stage":"primary","name":"Joe Biden","prefs":{"topic-healthcare":{"dir-he1":5,"dir-he3":4},"topic-climate-change":{"dir-c1":5},"topic-justice-rights-safety":{"dir-cj3":4,"dir-cj2":4},"topic-foreign-policy-security":{"dir-ia1":5,"dir-mi1":4,"dir-tr2":4},"topic-economy-work":{"dir-lw1":5}}},
{"year":2020,"party":"D","stage":"primary","name":"Bernie Sanders","prefs":{"topic-healthcare":{"dir-he1":5,"dir-he2":5,"dir-he3":5},"topic-economy-work":{"dir-lw1":5,"dir-lw3":5},"topic-climate-change":{"dir-c1":5},"topic-education":{"dir-ed5":5,"dir-ed6":5},"topic-justice-rights-safety":{"dir-cj2":5},"topic-foreign-policy-security":{"dir-mi2":5}}},
{"year":2020,"party":"R","stage":"primary","name":"Donald Trump","prefs":{"topic-taxes":{"dir-ta1":5},"topic-immigration":{"dir-im3":5},"topic-foreign-policy-security":{"dir-ia2":5,"dir-mi1":4,"dir-tr2":4},"topic-guns-firearms":{"dir-gf2":5}}},
{"year":2020,"party":"D","stage":"general","name":"Joe Biden","prefs":{"topic-public-health":{"dir-ph1":5,"dir-ph2":5},"topic-healthcare":{"dir-he1":5},"topic-economy-work":{"dir-lw1":5},"topic-climate-change":{"dir-c1":5},"topic-foreign-policy-security":{"dir-ia1":5}}},
{"year":2020,"party":"R","stage":"general","name":"Donald Trump","prefs":{"topic-taxes":{"dir-ta1":5},"topic-immigration":{"dir-im3":5},"topic-foreign-policy-security":{"dir-ia2":5,"dir-mi1":4,"dir-tr5":4},"topic-healthcare":{"dir-he3":4},"topic-public-health":{"dir-ph1":3,"dir-ph2":3},"topic-guns-firearms":{"dir-gf2":5}}},

{"year":2024,"party":"D","stage":"primary","name":"Joe Biden","prefs":{"topic-healthcare":{"dir-he1":5,"dir-he2":4},"topic-economy-work":{"dir-lw1":5,"dir-ec5":4,"dir-ta1":4},"topic-climate-change":{"dir-c1":5,"dir-c2":4},"topic-immigration":{"dir-im1":4,"dir-im3":3},"topic-guns-firearms":{"dir-gf1":4,"dir-gf3":4},"topic-justice-rights-safety":{"dir-cj2":5,"dir-cj1":4},"topic-reproductive-health":{"dir-a3":5},"topic-foreign-policy-security":{"dir-ia1":5,"dir-mi1":4}}},
{"year":2024,"party":"D","stage":"primary","name":"Marianne Williamson","prefs":{"topic-healthcare":{"dir-he1":5,"dir-he2":5},"topic-climate-change":{"dir-c1":5},"topic-economy-work":{"dir-lw1":5,"dir-lw3":4},"topic-justice-rights-safety":{"dir-cr1":5,"dir-cj2":5},"topic-foreign-policy-security":{"dir-mi2":5}}},
{"year":2024,"party":"R","stage":"primary","name":"Donald Trump","prefs":{"topic-immigration":{"dir-im3":5},"topic-foreign-policy-security":{"dir-ia2":5,"dir-mi1":4,"dir-tr2":5},"topic-taxes":{"dir-ta1":4,"dir-ta5":4,"dir-ta2":3},"topic-guns-firearms":{"dir-gf2":5},"topic-reproductive-health":{"dir-a1":4},"topic-energy":{"dir-en1":4,"dir-en2":3}}},
{"year":2024,"party":"R","stage":"primary","name":"Ron DeSantis","prefs":{"topic-education":{"dir-ed4":5},"topic-technology-privacy":{"dir-te4":4,"dir-pr3":3},"topic-economy-work":{"dir-lw1":4}}},
{"year":2024,"party":"R","stage":"primary","name":"Nikki Haley","prefs":{"topic-foreign-policy-security":{"dir-ia3":4,"dir-ia1":4,"dir-ia2":4},"topic-taxes":{"dir-ta5":4},"topic-immigration":{"dir-im3":5,"dir-im1":3},"topic-reproductive-health":{"dir-a1":4},"topic-guns-firearms":{"dir-gf2":4}}},
{"year":2024,"party":"D","stage":"general","name":"Kamala Harris","prefs":{"topic-economy-work":{"dir-lw1":5,"dir-lw3":4},"topic-healthcare":{"dir-he1":5},"topic-reproductive-health":{"dir-a2":5,"dir-a3":5},"topic-environment":{"dir-e1":5,"dir-e5":4},"topic-justice-rights-safety":{"dir-cj3":4},"topic-foreign-policy-security":{"dir-ia1":4}}},
{"year":2024,"party":"R","stage":"general","name":"Donald Trump","prefs":{"topic-taxes":{"dir-ta1":4,"dir-ta5":4},"topic-immigration":{"dir-im3":5,"dir-im1":3},"topic-foreign-policy-security":{"dir-ia2":5,"dir-mi1":4,"dir-tr2":5},"topic-energy":{"dir-en1":4,"dir-en2":3},"topic-guns-firearms":{"dir-gf2":5}}}
]}
JSON
)

emit_candidate() {
  local entry_json="$1"
  local name year party stage slug title
  name="$(jq -r '.name' <<<"$entry_json")"
  year="$(jq -r '.year' <<<"$entry_json")"
  party="$(jq -r '.party' <<<"$entry_json")"
  stage="$(jq -r '.stage' <<<"$entry_json")"
  slug="$(printf "%s" "$name" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9 ' | tr ' ' '-' )-${year}-${stage}"
  # Capitalize stage in a POSIX-compatible way (works in zsh and bash)
  stage_cap="$(printf '%s' "$stage" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')"
  title="${name} — ${year} (${party}) ${stage_cap}"
  # ISO timestamps required by schema
  NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq -n \
    --argfile sp "$STARTER" \
    --arg title "$title" \
    --arg now "$NOW" \
    --arg party "$party" \
    --argjson party_defaults "$PARTY_DEFAULTS" \
    --argjson prefs "$(jq -c '.prefs' <<<"$entry_json")" '
  ($party_defaults[$party]) as $pd |
  {version:$sp.version,title:$title,notes:"",createdAt:$now,updatedAt:$now,
   topics: ($sp.topics | map(
     . as $t |
     (
       $t.directions
       | map(. as $d | {
           id: $d.id,
           text: $d.text,
           stars: (((($prefs[$t.id] // {})[$d.id]) // (($pd[$t.id] // {})[$d.id]) // 0)),
           sources: [],
           tags: []
         })
     ) as $dirs |
     {
       id: $t.id,
       title: $t.title,
       importance: (([$dirs[].stars] | max) // 0),
       stance: "neutral",
       directions: $dirs,
       notes: "",
       sources: [],
       relations: ($t.relations // {broader:[],narrower:[],related:[]})
     }
   ))
  }' > "${OUTDIR}/${slug}.json"
}

count="$(jq -r '.candidates|length' <<<"$MAP")"
echo "Generating $count files into $OUTDIR" >&2
for ((i=0;i<count;i++)); do emit_candidate "$(jq -c --argjson i "$i" '.candidates[$i]' <<<"$MAP")"; done

find "$OUTDIR" -maxdepth 1 -type f -name '*.json' | sort
