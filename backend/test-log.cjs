fetch('https://api.github.com/repos/ricky229/site2app/actions/runs/22981276585/jobs', {headers: {'Authorization': 'Bearer ghp_YaYXxs1arjlHfpQ6ha5Up22vVk'}}).then(r=>r.json()).then(j=>console.log(j));
