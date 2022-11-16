import http from 'k6/http'
import { check, sleep } from 'k6'
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js"

export const options = {
    stages: [
        { duration: '5m', target: 100 }, // simulate ramp-up of traffic from 1 to 100 users over 5 minutes.
        { duration: '10m', target: 100 }, // stay at 100 users for 10 minutes
        { duration: '5m', target: 0 } // ramp-down to 0 users
    ],
    thresholds: {
        'http_req_duration': ['p(99)<1500'] // 99% of requests must complete below 1.5s
    },
}

export function handleSummary(data) {
    return {
        "test/load/access_documentation.html": htmlReport(data)
    }
}

export default function () {
    const res = http.get("https://moleculer.services/docs/0.14/")
    check(res, { 'status was 200': (r) => r.status == 200 })
    sleep(1)
}

// To run this test, run on the terminal this command: test/k6 run test/load/documentation.js
