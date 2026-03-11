async function testApi() {
    try {
        const res = await fetch('http://localhost:4000/api/notifications/send', {
            method: 'POST',
            body: JSON.stringify({
                title: "Test UI 2",
                body: "Le push marche enfin de bout en bout",
                buildId: "1772904081909",
                target: ["e_C7PTQbSo-_FheVhSZjaJ:APA91bEukRgo-OFORLYJAz4j5gKu4-f3OcYaA2d8DlnrcrpE53MPaBDIF_m-cjEfCv-RvuHdNbC9_W2hzL4ynqKfpJtLAxs2Pk15ehVuTIU3VjkzAHeyY6A"],
                actionUrl: null
            }),
            headers: {
                'Content-Type': 'application/json',
                // How to authenticate?
            }
        });
        const text = await res.text();
        console.log("Response:", res.status, text);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testApi();
