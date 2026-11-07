#!/bin/bash
# usage: drive_all.sh RES OUTDIR [names...]
RES=$1; OUT=$2; shift 2
mkdir -p $OUT
NAMES="$@"
if [ -z "$NAMES" ]; then NAMES=$(python3 -c "import json;print(' '.join(j['out'] for j in json.load(open('/tmp/claude-0/blend/jobs.json'))['jobs']))"); fi
for n in $NAMES; do
  if [ -f "$OUT/$n.png" ]; then continue; fi
  timeout 1500 /tmp/claude-0/bvenv/bin/python /tmp/claude-0/blend/render_job.py $n $RES $OUT 2>&1 | grep -E "DONE|Error|Traceback|line [0-9]+" | head -6
done
echo ALLDONE
