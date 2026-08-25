pipeline {
  agent any

  environment {
    REGISTRY = '192.168.3.10:5000'
    IMAGE    = "${REGISTRY}/devops-01/campus-notes"
    TAG      = "${env.BUILD_NUMBER}"
  }

  options {
    timeout(time: 15, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  // Webhooks cannot reach this network -- vm-ci is on a private address.
  triggers { pollSCM('H/2 * * * *') }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Build image') {
      steps { sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest .' }
    }

    stage('SAST') {
      steps {
        sh '''
          docker run --rm \
            -v jenkins-data:/var/jenkins_home:ro \
            -w "$WORKSPACE" \
            semgrep/semgrep:${SEMGREP_TAG} \
            semgrep \
              --config .semgrep/rules.yml \
              --error \
              src
        '''
      }
    }

    stage('Smoke test') {
      steps {
        sh '''
          name="campus-notes-smoke-${BUILD_NUMBER}"
          trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
          docker run -d --name "$name" -e SESSION_SECRET=smoke-only "$IMAGE:$TAG"
          for i in $(seq 1 20); do
            if docker exec "$name" /nodejs/bin/node -e \
                 "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
              echo "healthy after ${i}s"; exit 0
            fi
            sleep 1
          done
          echo "never became healthy"; docker logs "$name"; exit 1
        '''
      }
    }

    stage('Push') {
      steps { sh 'docker push $IMAGE:$TAG && docker push $IMAGE:latest' }
    }
  }

  post {
    failure {
      echo 'Pipeline failed. Read which stage failed before changing anything.'
    }
  }
}
